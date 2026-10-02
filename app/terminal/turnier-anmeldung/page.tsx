"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Delete,
  Euro,
  KeyRound,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UserRoundSearch,
  Users,
  X,
} from "lucide-react"
import TerminalLink from "../_components/TerminalLink"
import TerminalIdentityAuth, { type VerifiedTerminalIdentity } from "../_components/TerminalIdentityAuth"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type TournamentEvent = {
  source_kind: "central" | "series"
  event_id: string
  series_id: string | null
  series_name: string | null
  title: string
  event_date: string
  start_time: string | null
  location: string | null
  max_participants: number | null
  entry_fee: number
  access_type: "public" | "club_internal" | "club_external"
  event_status: string
  registered_count: number
  waitlist_count: number
  registration_open: boolean
  is_today: boolean
}

type ExternalPlayer = {
  player_id: string
  name: string
  verein: string | null
  sportdarts_player_number: string | null
  sportdarts_name: string | null
}

type VerifiedMember = {
  playerId: string
  spieldatenbankId: string
  name: string
  playerCode: string
  photoUrl: string | null
  existingStatus: "registered" | "waitlist" | null
}

type RegistrationResult = {
  registration_status: "registered" | "waitlist"
  player_name: string
  result_message: string
}

type FlowMode = "choice" | "member" | "guest" | "guest-pin"

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`))
}

function fmtEuro(value: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0))
}

export default function TerminalTournamentRegistrationPage() {
  const [events, setEvents] = useState<TournamentEvent[]>([])
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null)
  const [flowMode, setFlowMode] = useState<FlowMode>("choice")

  const [pin, setPin] = useState("")
  const [pinChecking, setPinChecking] = useState(false)
  const [pinMessage, setPinMessage] = useState("")
  const [verifiedMember, setVerifiedMember] = useState<VerifiedMember | null>(null)
  const [memberCreditBalance, setMemberCreditBalance] = useState(0)

  const [unlockedMemberPin, setUnlockedMemberPin] = useState<string | null>(null)
  const [unlockedMemberIdentity, setUnlockedMemberIdentity] = useState<VerifiedTerminalIdentity | null>(null)
  const [memberAccessName, setMemberAccessName] = useState("")
  const [accessUnlockOpen, setAccessUnlockOpen] = useState(false)
  const [accessUnlockPin, setAccessUnlockPin] = useState("")
  const [accessUnlockChecking, setAccessUnlockChecking] = useState(false)
  const [accessUnlockMessage, setAccessUnlockMessage] = useState("")

  const [guestQuery, setGuestQuery] = useState("")
  const [guestSearching, setGuestSearching] = useState(false)
  const [guestMessage, setGuestMessage] = useState("")
  const [guestResults, setGuestResults] = useState<ExternalPlayer[]>([])
  const [selectedGuest, setSelectedGuest] = useState<ExternalPlayer | null>(null)
  const [guestConfirmed, setGuestConfirmed] = useState(false)
  const [guestExistingStatus, setGuestExistingStatus] = useState<"registered" | "waitlist" | null>(null)
  const [guestStatusChecking, setGuestStatusChecking] = useState(false)

  const [guestPin, setGuestPin] = useState("")
  const [guestPinChecking, setGuestPinChecking] = useState(false)
  const [guestPinMessage, setGuestPinMessage] = useState("")
  const [verifiedGuestPin, setVerifiedGuestPin] = useState<{
    authUserId: string
    spieldatenbankId: string | null
    name: string
    existingStatus: "registered" | "waitlist" | null
    linkRequired: boolean
  } | null>(null)

  const [registering, setRegistering] = useState(false)
  const [memberUnregisterConfirm, setMemberUnregisterConfirm] = useState(false)
  const [memberUnregistering, setMemberUnregistering] = useState(false)
  const [memberUnregisterMessage, setMemberUnregisterMessage] = useState("")
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [resultError, setResultError] = useState("")
  const [terminalIdentity, setTerminalIdentity] = useState<VerifiedTerminalIdentity | null>(null)
  const [terminalEventContext, setTerminalEventContext] = useState<any | null>(null)
  const [terminalIdentityChecking, setTerminalIdentityChecking] = useState(false)

  const loadEvents = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)

    try {
      const { data, error } = unlockedMemberIdentity
        ? await supabase.rpc("terminal_list_tournament_registration_items_identity", {
            p_identity_id: unlockedMemberIdentity.identity_id,
            p_method: unlockedMemberIdentity.auth_method,
            p_secret: unlockedMemberIdentity.secret,
          })
        : await supabase.rpc(
            "terminal_list_tournament_registration_items",
            { p_member_pin: null },
          )

      if (error) throw error

      const rpcItems = ((data || []) as any[]).map((row) => ({
        source_kind: row.source_kind === "series" ? "series" : "central",
        event_id: String(row.event_id),
        series_id: row.series_id ? String(row.series_id) : null,
        series_name: row.series_name ? String(row.series_name) : null,
        title: String(row.title || ""),
        event_date: String(row.event_date || ""),
        start_time: row.start_time ? String(row.start_time) : null,
        location: row.location ? String(row.location) : null,
        max_participants:
          row.max_participants == null ? null : Number(row.max_participants),
        entry_fee: Number(row.entry_fee || 0),
        access_type: row.access_type,
        event_status: String(row.event_status || ""),
        registered_count: Number(row.registered_count || 0),
        waitlist_count: Number(row.waitlist_count || 0),
        registration_open: Boolean(row.registration_open),
        is_today: Boolean(row.is_today),
      })) as TournamentEvent[]

      // Öffentliche Serien zusätzlich direkt laden.
      // So erscheinen öffentliche Spieltage auch dann zuverlässig,
      // wenn PostgREST/RPC noch eine ältere Funktionsdefinition gecacht hat.
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: publicSeriesRows, error: publicSeriesError } = await supabase
        .from("dko_series")
        .select(
          "id,name,startgeld,access_type,max_participants,registration_enabled,registration_open_mode,registration_open_time,registration_close_mode,registration_close_time",
        )
        .eq("is_active", true)
        .eq("access_type", "public")

      if (publicSeriesError) throw publicSeriesError

      const publicSeries = (publicSeriesRows || []) as any[]
      const publicSeriesIds = publicSeries.map((row) => String(row.id))
      const directSeriesItems: TournamentEvent[] = []

      if (publicSeriesIds.length > 0) {
        const { data: seriesEventRows, error: seriesEventError } = await supabase
          .from("dko_series_events")
          .select(
            "id,series_id,title,start_at,location,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at",
          )
          .in("series_id", publicSeriesIds)
          .eq("is_matchday", true)
          .order("start_at", { ascending: true })

        if (seriesEventError) throw seriesEventError

        const futureEvents = (seriesEventRows || []).filter((row: any) => {
          const effectiveStart = new Date(
            row.is_rescheduled && row.rescheduled_at ? row.rescheduled_at : row.start_at,
          )
          return effectiveStart.getTime() >= today.getTime()
        })

        const eventIds = futureEvents.map((row: any) => String(row.id))
        const registrationCounts = new Map<string, number>()

        if (eventIds.length > 0) {
          const { data: regRows, error: regError } = await supabase
            .from("dko_tournament_registration")
            .select("event_id")
            .in("event_id", eventIds)

          if (regError) throw regError

          ;(regRows || []).forEach((row: any) => {
            const id = String(row.event_id || "")
            if (!id) return
            registrationCounts.set(id, (registrationCounts.get(id) || 0) + 1)
          })
        }

        for (const row of futureEvents) {
          const series = publicSeries.find(
            (item: any) => String(item.id) === String(row.series_id),
          )
          if (!series) continue

          const effectiveStart = new Date(
            row.is_rescheduled && row.rescheduled_at ? row.rescheduled_at : row.start_at,
          )

          const eventDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Vienna",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(effectiveStart)

          const timeParts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Vienna",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(effectiveStart)

          let registrationOpen = series.registration_enabled !== false

          const now = new Date()
          const cutoffMinutes = Math.max(
            0,
            Number(row.registration_cutoff_minutes || 0),
          )

          if (series.registration_open_mode !== "always") {
            const localDate = new Date(`${eventDate}T00:00:00`)
            const [oh, om] = String(series.registration_open_time || "00:00")
              .slice(0, 5)
              .split(":")
              .map(Number)
            localDate.setHours(oh || 0, om || 0, 0, 0)
            if (now.getTime() < localDate.getTime()) registrationOpen = false
          }

          let closeAt: Date
          if (series.registration_close_mode === "fixed_time") {
            closeAt = new Date(`${eventDate}T00:00:00`)
            const [ch, cm] = String(series.registration_close_time || "17:00")
              .slice(0, 5)
              .split(":")
              .map(Number)
            closeAt.setHours(ch || 17, cm || 0, 0, 0)
          } else {
            closeAt = new Date(effectiveStart.getTime() - cutoffMinutes * 60_000)
          }

          if (now.getTime() > closeAt.getTime()) registrationOpen = false

          directSeriesItems.push({
            source_kind: "series",
            event_id: String(row.id),
            series_id: String(series.id),
            series_name: String(series.name || ""),
            title: String(row.title || series.name || "Spieltag"),
            event_date: eventDate,
            start_time: `${timeParts}:00`,
            location: row.location ? String(row.location) : null,
            max_participants:
              series.max_participants == null ? null : Number(series.max_participants),
            entry_fee: Number(series.startgeld || 0),
            access_type: "public",
            event_status: "open",
            registered_count: registrationCounts.get(String(row.id)) || 0,
            waitlist_count: 0,
            registration_open: registrationOpen,
            is_today:
              eventDate ===
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Europe/Vienna",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date()),
          })
        }
      }

      const merged = new Map<string, TournamentEvent>()

      for (const item of [...rpcItems, ...directSeriesItems]) {
        merged.set(`${item.source_kind}:${item.event_id}`, item)
      }

      setEvents(
        Array.from(merged.values()).sort((a, b) => {
          const aKey = `${a.event_date} ${a.start_time || "23:59:59"}`
          const bKey = `${b.event_date} ${b.start_time || "23:59:59"}`
          return aKey.localeCompare(bKey, "de")
        }),
      )
    } catch (error) {
      console.error("Terminal tournament events load error:", error)
      setEvents([])
    } finally {
      setInitialLoadDone(true)
      setRefreshing(false)
    }
  }, [unlockedMemberIdentity])

  useEffect(() => {
    void loadEvents(false)
  }, [loadEvents])

  useEffect(() => {
    const channel = supabase
      .channel("terminal-tournament-registration-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "central_tournament_registrations",
        },
        () => void loadEvents(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "central_tournament_events",
        },
        () => void loadEvents(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_series",
        },
        () => void loadEvents(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_series_events",
        },
        () => void loadEvents(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_tournament_registration",
        },
        () => void loadEvents(false),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadEvents])

  useEffect(() => {
    if (!result) return

    const timer = window.setTimeout(() => {
      resetFlow(true)
    }, 4500)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  useEffect(() => {
    if (flowMode !== "guest" || selectedGuest) return

    const q = guestQuery.trim()
    if (q.length < 3) {
      setGuestResults([])
      setGuestMessage("")
      return
    }

    const timer = window.setTimeout(async () => {
      setGuestSearching(true)
      setGuestMessage("")

      try {
        const response = await fetch(
          `/api/terminal/tournament-player-search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        )
        const body = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(body?.error || "Spielersuche fehlgeschlagen.")
        }

        setGuestResults((body?.players || []) as ExternalPlayer[])
        if (!(body?.players || []).length) {
          setGuestMessage(
            "Kein passender externer Spieler gefunden. Bitte an die Turnierleitung wenden.",
          )
        }
      } catch (error: any) {
        console.error("Terminal external player search error:", error)
        setGuestResults([])
        setGuestMessage(
          error?.message || "Spielersuche konnte nicht durchgeführt werden.",
        )
      } finally {
        setGuestSearching(false)
      }
    }, 320)

    return () => window.clearTimeout(timer)
  }, [guestQuery, flowMode, selectedGuest])

  const unlockMemberEvents = async () => {
    if (accessUnlockPin.length !== 4 || accessUnlockChecking) return

    setAccessUnlockChecking(true)
    setAccessUnlockMessage("")

    try {
      const { data, error } = await supabase.rpc(
        "terminal_tournament_access_for_pin",
        { p_pin: accessUnlockPin },
      )

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : null
      if (!row?.club_player_id) {
        setAccessUnlockMessage("PIN nicht erkannt.")
        setAccessUnlockPin("")
        return
      }

      if (!row.can_internal && !row.can_external) {
        setAccessUnlockMessage(
          "Dein aktuelles Mitgliedspaket enthält keine zusätzlichen internen Turniere.",
        )
        return
      }

      setMemberAccessName(String(row.member_name || "EMD Mitglied"))
      setUnlockedMemberPin(accessUnlockPin)
      setAccessUnlockOpen(false)
      setAccessUnlockMessage("")
    } catch (error: any) {
      console.error("Terminal tournament access unlock error:", error)
      setAccessUnlockMessage(error?.message || "Mitgliederzugang konnte nicht geprüft werden.")
    } finally {
      setAccessUnlockChecking(false)
    }
  }

  const lockMemberEvents = () => {
    setUnlockedMemberPin(null)
    setUnlockedMemberIdentity(null)
    setMemberAccessName("")
    setAccessUnlockPin("")
    setAccessUnlockMessage("")
    setAccessUnlockOpen(false)
  }

  const unlockMemberEventsWithIdentity = async (identity: VerifiedTerminalIdentity) => {
    if (identity.identity_kind !== "member") return
    setUnlockedMemberIdentity(identity)
    setMemberAccessName(identity.name)
    setAccessUnlockOpen(false)
    setAccessUnlockMessage("")
  }

  const todayEvents = useMemo(
    () => events.filter((event) => event.is_today),
    [events],
  )

  const upcomingEvents = useMemo(
    () => events.filter((event) => !event.is_today),
    [events],
  )

  const resetFlow = (keepEventList = false) => {
    setSelectedEvent(null)
    setFlowMode("choice")
    setPin("")
    setPinChecking(false)
    setPinMessage("")
    setVerifiedMember(null)
    setMemberCreditBalance(0)
    setGuestQuery("")
    setGuestSearching(false)
    setGuestMessage("")
    setGuestResults([])
    setSelectedGuest(null)
    setGuestConfirmed(false)
    setGuestExistingStatus(null)
    setGuestStatusChecking(false)
    setGuestPin("")
    setGuestPinChecking(false)
    setGuestPinMessage("")
    setVerifiedGuestPin(null)
    setRegistering(false)
    setMemberUnregisterConfirm(false)
    setMemberUnregistering(false)
    setMemberUnregisterMessage("")
    setResult(null)
    setResultError("")
    setTerminalIdentity(null)
    setTerminalEventContext(null)
    setTerminalIdentityChecking(false)
    if (keepEventList) void loadEvents(false)
  }

  const selectEvent = (event: TournamentEvent) => {
    setSelectedEvent(event)
    setFlowMode("choice")
    setResultError("")
    setResult(null)
    setTerminalIdentity(null)
    setTerminalEventContext(null)
  }

  const closeMemberLogin = () => {
    setFlowMode("choice")
    setPin("")
    setPinMessage("")
    setVerifiedMember(null)
    setMemberCreditBalance(0)
    setMemberUnregisterConfirm(false)
    setMemberUnregisterMessage("")
    setResultError("")
  }

  const verifyPin = async () => {
    if (pin.length !== 4 || pinChecking) return

    setPinChecking(true)
    setPinMessage("")
    setVerifiedMember(null)

    try {
      if (!selectedEvent) return

      const { data, error } = await supabase.rpc(
        selectedEvent.source_kind === "series"
          ? "terminal_verify_member_for_series_event"
          : "terminal_verify_member_for_tournament",
        {
          p_event_id: selectedEvent.event_id,
          p_pin: pin,
        },
      )

      if (error) {
        if (String(error.message || "").toLowerCase().includes("rate limited")) {
          setPinMessage("Zu viele Fehlversuche. Bitte 10 Minuten warten.")
        } else {
          setPinMessage("PIN konnte nicht geprüft werden.")
        }
        return
      }

      const member = Array.isArray(data) ? data[0] : null

      if (!member?.club_player_id) {
        setPinMessage("PIN nicht erkannt.")
        setPin("")
        return
      }

      setVerifiedMember({
        playerId: String(member.club_player_id),
        spieldatenbankId: String(member.spieldatenbank_id),
        name: String(member.name || "EMD Mitglied"),
        playerCode: String(member.player_code || ""),
        photoUrl: member.photo_url ? String(member.photo_url) : null,
        existingStatus:
          member.existing_status === "registered" || member.existing_status === "waitlist"
            ? member.existing_status
            : null,
      })

      const { data: creditRow } = await supabase
        .from("player_credits")
        .select("credit_balance")
        .eq("player_id", String(member.club_player_id))
        .maybeSingle()

      setMemberCreditBalance(Number(creditRow?.credit_balance || 0))
    } catch (error) {
      console.error("Terminal PIN verify error:", error)
      setPinMessage("PIN konnte nicht geprüft werden.")
    } finally {
      setPinChecking(false)
    }
  }

  const registerMember = async (paymentMethod: "on_site" | "credit") => {
    if (!selectedEvent || !verifiedMember || pin.length !== 4) return

    setRegistering(true)
    setResultError("")

    try {
      const { data, error } = await supabase.rpc(
        selectedEvent.source_kind === "series"
          ? "terminal_register_member_series_event"
          : "terminal_register_member_tournament",
        {
          p_event_id: selectedEvent.event_id,
          p_pin: pin,
          p_payment_method: paymentMethod,
        },
      )

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : null
      if (!row) throw new Error("Anmeldung konnte nicht bestätigt werden.")

      setResult({
        registration_status: row.registration_status,
        player_name: row.player_name,
        result_message: row.result_message,
      })

      const { data: refreshedCredit } = await supabase
        .from("player_credits")
        .select("credit_balance")
        .eq("player_id", verifiedMember.playerId)
        .maybeSingle()
      setMemberCreditBalance(Number(refreshedCredit?.credit_balance || 0))

      void loadEvents(false)
    } catch (error: any) {
      console.error("Terminal member registration error:", error)
      setResultError(error?.message || "Anmeldung fehlgeschlagen.")
    } finally {
      setRegistering(false)
    }
  }

  const unregisterMember = async () => {
    if (!selectedEvent || !verifiedMember || pin.length !== 4) return

    setMemberUnregistering(true)
    setMemberUnregisterMessage("")
    setResultError("")

    try {
      const { data, error } = await supabase.rpc(
        selectedEvent.source_kind === "series"
          ? "terminal_unregister_member_series_event"
          : "terminal_unregister_member_tournament",
        {
          p_event_id: selectedEvent.event_id,
          p_pin: pin,
        },
      )

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : null
      if (!row) throw new Error("Abmeldung konnte nicht bestätigt werden.")

      setMemberUnregisterMessage(
        row.result_message || "Du wurdest erfolgreich vom Turnier abgemeldet.",
      )
      setMemberUnregisterConfirm(false)
      setVerifiedMember((current) =>
        current ? { ...current, existingStatus: null } : current,
      )

      const { data: refreshedCredit } = await supabase
        .from("player_credits")
        .select("credit_balance")
        .eq("player_id", verifiedMember.playerId)
        .maybeSingle()
      setMemberCreditBalance(Number(refreshedCredit?.credit_balance || 0))

      void loadEvents(false)
    } catch (error: any) {
      console.error("Terminal member unregister error:", error)
      setResultError(error?.message || "Abmeldung fehlgeschlagen.")
    } finally {
      setMemberUnregistering(false)
    }
  }

  const closeGuestPinLogin = () => {
    setFlowMode("choice")
    setGuestPin("")
    setGuestPinMessage("")
    setVerifiedGuestPin(null)
    setResultError("")
  }

  const verifyGuestPin = async () => {
    if (!selectedEvent || guestPin.length !== 4 || guestPinChecking) return

    setGuestPinChecking(true)
    setGuestPinMessage("")
    setVerifiedGuestPin(null)
    setResultError("")

    try {
      const { data, error } = await supabase.rpc(
        selectedEvent.source_kind === "series"
          ? "terminal_verify_guest_for_series_event"
          : "terminal_verify_guest_for_tournament",
        {
          p_event_id: selectedEvent.event_id,
          p_pin: guestPin,
        },
      )

      if (error) {
        const message = String(error.message || "").toLowerCase()
        if (message.includes("rate limited")) {
          setGuestPinMessage("Zu viele Fehlversuche. Bitte 10 Minuten warten.")
        } else if (
          message.includes("function") ||
          message.includes("does not exist")
        ) {
          setGuestPinMessage("Gast-PIN ist im Terminal noch nicht aktiviert.")
        } else {
          setGuestPinMessage("PIN konnte nicht geprüft werden.")
        }
        return
      }

      const guest = Array.isArray(data) ? data[0] : null

      if (!guest?.auth_user_id) {
        setGuestPinMessage("PIN nicht erkannt.")
        setGuestPin("")
        return
      }

      setVerifiedGuestPin({
        authUserId: String(guest.auth_user_id),
        spieldatenbankId: guest.spieldatenbank_id
          ? String(guest.spieldatenbank_id)
          : null,
        name: String(guest.name || "Gast"),
        existingStatus:
          guest.existing_status === "registered" ||
          guest.existing_status === "waitlist"
            ? guest.existing_status
            : null,
        linkRequired: Boolean(guest.link_required),
      })
    } catch (error) {
      console.error("Terminal guest PIN verify error:", error)
      setGuestPinMessage("PIN konnte nicht geprüft werden.")
    } finally {
      setGuestPinChecking(false)
    }
  }

  const registerGuestPin = async () => {
    if (!selectedEvent || !verifiedGuestPin || guestPin.length !== 4) return
    if (verifiedGuestPin.linkRequired || !verifiedGuestPin.spieldatenbankId) return

    setRegistering(true)
    setResultError("")

    try {
      const { data, error } = await supabase.rpc(
        selectedEvent.source_kind === "series"
          ? "terminal_register_guest_series_event"
          : "terminal_register_guest_tournament",
        {
          p_event_id: selectedEvent.event_id,
          p_pin: guestPin,
        },
      )

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : null
      if (!row) throw new Error("Anmeldung konnte nicht bestätigt werden.")

      setResult({
        registration_status: row.registration_status,
        player_name: row.player_name,
        result_message: row.result_message,
      })
      void loadEvents(false)
    } catch (error: any) {
      console.error("Terminal guest PIN registration error:", error)
      setResultError(error?.message || "Anmeldung fehlgeschlagen.")
    } finally {
      setRegistering(false)
    }
  }

  const selectGuestPlayer = async (player: ExternalPlayer) => {
    if (!selectedEvent) return

    setSelectedGuest(player)
    setGuestConfirmed(false)
    setGuestExistingStatus(null)
    setGuestStatusChecking(true)
    setResultError("")

    try {
      const { data, error } = await supabase.rpc(
        selectedEvent.source_kind === "series"
          ? "terminal_get_series_player_registration_status"
          : "terminal_get_player_registration_status",
        {
          p_event_id: selectedEvent.event_id,
          p_player_id: player.player_id,
        },
      )

      if (error) throw error

      if (data === "registered" || data === "waitlist") {
        setGuestExistingStatus(data)
      }
    } catch (error: any) {
      console.error("Terminal registration status check error:", error)
      setResultError("Anmeldestatus konnte nicht geprüft werden.")
    } finally {
      setGuestStatusChecking(false)
    }
  }

  const registerGuest = async () => {
    if (!selectedEvent || !selectedGuest || !guestConfirmed) return

    setRegistering(true)
    setResultError("")

    try {
      const { data, error } = await supabase.rpc(
        selectedEvent.source_kind === "series"
          ? "terminal_register_external_series_player"
          : "terminal_register_external_tournament_player",
        {
          p_event_id: selectedEvent.event_id,
          p_player_id: selectedGuest.player_id,
        },
      )

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : null
      if (!row) throw new Error("Anmeldung konnte nicht bestätigt werden.")

      setResult({
        registration_status: row.registration_status,
        player_name: row.player_name,
        result_message: row.result_message,
      })
      void loadEvents(false)
    } catch (error: any) {
      console.error("Terminal guest registration error:", error)
      setResultError(error?.message || "Anmeldung fehlgeschlagen.")
    } finally {
      setRegistering(false)
    }
  }

  const verifySelectedIdentity = async (identity: VerifiedTerminalIdentity) => {
    if (!selectedEvent) return
    setTerminalIdentityChecking(true)
    setResultError("")
    try {
      const { data, error } = await supabase.rpc("terminal_verify_identity_for_event", {
        p_source_kind: selectedEvent.source_kind,
        p_event_id: selectedEvent.event_id,
        p_identity_kind: identity.identity_kind,
        p_identity_id: identity.identity_id,
        p_method: identity.auth_method,
        p_secret: identity.secret,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : null
      if (!row?.identity_id) throw new Error("Profil konnte nicht bestätigt werden.")
      setTerminalIdentity(identity)
      setTerminalEventContext(row)
    } catch (error: any) {
      console.error("Terminal event identity verify error:", error)
      setResultError(error?.message || "Profil konnte nicht bestätigt werden.")
    } finally {
      setTerminalIdentityChecking(false)
    }
  }

  const registerSelectedIdentity = async (paymentMethod: "on_site" | "credit") => {
    if (!selectedEvent || !terminalIdentity || registering) return
    setRegistering(true)
    setResultError("")
    try {
      const { data, error } = await supabase.rpc("terminal_register_identity_for_event", {
        p_source_kind: selectedEvent.source_kind,
        p_event_id: selectedEvent.event_id,
        p_identity_kind: terminalIdentity.identity_kind,
        p_identity_id: terminalIdentity.identity_id,
        p_method: terminalIdentity.auth_method,
        p_secret: terminalIdentity.secret,
        p_payment_method: paymentMethod,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : null
      if (!row) throw new Error("Anmeldung konnte nicht bestätigt werden.")
      setResult({
        registration_status: row.registration_status,
        player_name: row.player_name,
        result_message: row.result_message,
      })
      void loadEvents(false)
    } catch (error: any) {
      console.error("Terminal identity registration error:", error)
      setResultError(error?.message || "Anmeldung fehlgeschlagen.")
    } finally {
      setRegistering(false)
    }
  }

  const unregisterSelectedIdentity = async () => {
    if (!selectedEvent || !terminalIdentity || memberUnregistering) return
    setMemberUnregistering(true)
    setResultError("")
    try {
      const { data, error } = await supabase.rpc("terminal_unregister_identity_for_event", {
        p_source_kind: selectedEvent.source_kind,
        p_event_id: selectedEvent.event_id,
        p_identity_kind: terminalIdentity.identity_kind,
        p_identity_id: terminalIdentity.identity_id,
        p_method: terminalIdentity.auth_method,
        p_secret: terminalIdentity.secret,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : null
      setMemberUnregisterMessage(row?.result_message || "Du wurdest erfolgreich abgemeldet.")
      setTerminalEventContext((current: any) => current ? { ...current, existing_status: null } : current)
      setMemberUnregisterConfirm(false)
      void loadEvents(false)
    } catch (error: any) {
      console.error("Terminal identity unregister error:", error)
      setResultError(error?.message || "Abmeldung fehlgeschlagen.")
    } finally {
      setMemberUnregistering(false)
    }
  }

  const addDigit = (digit: string) => {
    if (pin.length >= 4 || verifiedMember) return
    setPin((value) => `${value}${digit}`)
  }

  const eventCard = (event: TournamentEvent, prominent = false) => {
    const full =
      event.max_participants != null &&
      event.registered_count >= event.max_participants

    return (
      <button
        key={event.event_id}
        type="button"
        onClick={() => selectEvent(event)}
        className={`group relative w-full overflow-hidden rounded-[32px] border text-left backdrop-blur-2xl transition active:scale-[.992] ${
          prominent
            ? "border-orange-300/30 bg-orange-500/[0.075] p-6 shadow-[0_24px_80px_-42px_rgba(249,115,22,.7)]"
            : "border-white/10 bg-black/28 p-5 hover:border-cyan-200/25"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-3xl ${
            prominent ? "bg-orange-500/16" : "bg-cyan-400/10"
          }`}
        />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {prominent ? (
                  <span className="rounded-full border border-orange-300/25 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">
                    Heute
                  </span>
                ) : null}

                {event.source_kind === "series" ? (
                  <span className="rounded-full border border-violet-300/15 bg-violet-500/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/70">
                    Turnierserie
                  </span>
                ) : null}

                {event.access_type === "public" ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                    Öffentlich
                  </span>
                ) : event.access_type === "club_internal" ? (
                  <span className="rounded-full border border-cyan-200/15 bg-cyan-400/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
                    Intern · Paket erforderlich
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200/15 bg-amber-400/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/70">
                    Mitglieder-Zugang
                  </span>
                )}

                {!event.registration_open ? (
                  <span className="rounded-full border border-red-300/15 bg-red-500/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-100/60">
                    Anmeldung geschlossen
                  </span>
                ) : full ? (
                  <span className="rounded-full border border-amber-300/15 bg-amber-500/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/60">
                    Warteliste
                  </span>
                ) : null}
              </div>

              <h3
                className={`mt-4 font-black tracking-[-0.045em] text-white ${
                  prominent ? "text-3xl sm:text-4xl" : "text-2xl"
                }`}
              >
                {event.title}
              </h3>

              {event.source_kind === "series" && event.series_name ? (
                <div className="mt-1 text-sm font-black text-violet-200/55">
                  {event.series_name}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/45">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-orange-300/75" />
                  {fmtDate(event.event_date)}
                </span>
                {event.start_time ? (
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-cyan-200/65" />
                    {event.start_time.slice(0, 5)} Uhr
                  </span>
                ) : null}
                {event.location ? (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-white/35" />
                    {event.location}
                  </span>
                ) : null}
                {event.entry_fee > 0 ? (
                  <span className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-white/35" />
                    {fmtEuro(event.entry_fee)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 rounded-[22px] border border-white/10 bg-black/28 px-4 py-3 text-center">
              <div className="text-2xl font-black text-white">
                {event.registered_count}
                {event.max_participants ? ` / ${event.max_participants}` : ""}
              </div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                angemeldet
              </div>
            </div>
          </div>

          <div
            className={`mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${
              event.registration_open ? "text-orange-300" : "text-white/25"
            }`}
          >
            {event.registration_open ? "Zur Anmeldung" : "Details ansehen"}
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </button>
    )
  }

  if (result && selectedEvent) {
    const waitlist = result.registration_status === "waitlist"

    return (
      <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#050608] px-5 text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.48]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-black/66" />

        <div className="relative w-full max-w-3xl overflow-hidden rounded-[42px] border border-emerald-300/20 bg-[#070a0d]/94 p-7 text-center shadow-[0_35px_130px_rgba(0,0,0,.7)] backdrop-blur-2xl sm:p-10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-300">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <div className="mt-6 text-[11px] font-black uppercase tracking-[0.32em] text-emerald-200/65">
            {waitlist ? "Warteliste" : "Anmeldung erfolgreich"}
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            {result.player_name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-7 text-white/48 sm:text-lg">
            {result.result_message}
          </p>

          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4">
            <div className="text-sm font-black text-white">{selectedEvent.title}</div>
            <div className="mt-1 text-xs font-semibold text-white/35">
              {fmtDate(selectedEvent.event_date)}
              {selectedEvent.start_time ? ` · ${selectedEvent.start_time.slice(0, 5)} Uhr` : ""}
            </div>
          </div>

          <button
            type="button"
            onClick={() => resetFlow(true)}
            className="mt-7 min-h-[64px] rounded-2xl bg-emerald-500 px-8 text-sm font-black uppercase tracking-[0.16em] text-black transition active:scale-[.985]"
          >
            Fertig · nächster Spieler
          </button>

          <div className="mt-4 text-xs font-semibold text-white/25">
            Die Ansicht wird automatisch zurückgesetzt.
          </div>
        </div>
      </main>
    )
  }

  if (selectedEvent) {
    const ctx = terminalEventContext
    const isMember = terminalIdentity?.identity_kind === "member"
    const fee = Number(selectedEvent.entry_fee || 0)
    const balance = Number(ctx?.credit_balance || 0)

    return (
      <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
        <div className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.54]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.48),rgba(4,6,9,.88)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.15),transparent_28%),radial-gradient(circle_at_100%_82%,rgba(14,165,233,.10),transparent_30%)]" />

        <div className="relative mx-auto min-h-[100svh] max-w-[1400px] px-5 py-6 lg:px-8 lg:py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => resetFlow(false)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl active:scale-95">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-orange-300/90">
                  <span>Turnier-Anmeldung</span>
                  {selectedEvent.source_kind === "series" ? (
                    <span className="rounded-full border border-violet-300/15 bg-violet-500/[0.06] px-2.5 py-1 text-[9px] text-violet-100/70">Turnierserie</span>
                  ) : null}
                </div>
                <h1 className="mt-1 max-w-4xl text-2xl font-black tracking-[-0.045em] sm:text-4xl">{selectedEvent.title}</h1>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-white/35">
                  <span>{fmtDate(selectedEvent.event_date)}</span>
                  {selectedEvent.start_time ? <span>{selectedEvent.start_time.slice(0,5)} Uhr</span> : null}
                  {fee > 0 ? <span>{fmtEuro(fee)} Startgeld</span> : <span>Kostenlos</span>}
                </div>
              </div>
            </div>
          </header>

          {!selectedEvent.registration_open ? (
            <section className="mt-10 rounded-[36px] border border-red-300/15 bg-red-500/[0.045] p-8 text-center backdrop-blur-2xl">
              <X className="mx-auto h-12 w-12 text-red-200/60" />
              <h2 className="mt-4 text-3xl font-black">Anmeldung geschlossen</h2>
            </section>
          ) : !terminalIdentity || !ctx ? (
            <section className="mt-9">
              {resultError ? (
                <div className="mx-auto mb-4 max-w-4xl rounded-2xl border border-red-300/15 bg-red-500/[0.06] px-4 py-3 text-center text-sm font-bold text-red-100/70">
                  {resultError}
                </div>
              ) : null}
              <TerminalIdentityAuth
                title="Spieler suchen"
                subtitle="Vor- oder Nachname eingeben, Profil auswählen und anschließend mit PIN oder Muster bestätigen."
                onVerified={verifySelectedIdentity}
              />
              {selectedEvent.access_type === "public" ? (
                <div className="mx-auto mt-4 max-w-4xl rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-center text-xs font-semibold text-white/35">
                  Noch kein Gastkonto? Im Hauptmenü kannst du zuerst ein Gastkonto anlegen.
                </div>
              ) : null}
            </section>
          ) : (
            <section className="mx-auto mt-9 max-w-4xl">
              <div className="rounded-[38px] border border-emerald-300/18 bg-black/35 p-6 backdrop-blur-2xl sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] border border-emerald-300/20 bg-emerald-500/10">
                    {ctx.photo_url ? <img src={ctx.photo_url} alt="" className="h-full w-full object-cover" /> : <BadgeCheck className="h-8 w-8 text-emerald-300" />}
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/55">
                      {ctx.identity_kind === "member" ? "EMD-Mitglied bestätigt" : "Gast bestätigt"}
                    </div>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">{ctx.name}</h2>
                  </div>
                </div>

                {ctx.link_required ? (
                  <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-500/[0.07] p-5 text-sm font-bold text-amber-100/80">
                    Dieses Gastprofil ist noch nicht mit der Spielerdatenbank verknüpft.
                  </div>
                ) : ctx.existing_status ? (
                  <div className="mt-6">
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/[0.07] px-5 py-4 text-center font-black text-emerald-100">
                      {ctx.existing_status === "waitlist" ? "Du stehst bereits auf der Warteliste." : "Du bist bereits angemeldet."}
                    </div>
                    {memberUnregisterConfirm ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button type="button" onClick={() => setMemberUnregisterConfirm(false)}
                          className="min-h-[56px] rounded-2xl border border-white/10 bg-white/[0.035] font-black text-white/55">Abbrechen</button>
                        <button type="button" onClick={() => void unregisterSelectedIdentity()} disabled={memberUnregistering}
                          className="min-h-[56px] rounded-2xl bg-red-600 font-black text-white disabled:opacity-40">
                          {memberUnregistering ? "Wird abgemeldet …" : "Ja · abmelden"}
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setMemberUnregisterConfirm(true)}
                        className="mt-4 min-h-[56px] w-full rounded-2xl border border-red-300/20 bg-red-500/[0.06] font-black text-red-100/80">
                        Vom Turnier abmelden
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 px-5 py-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-white/45">
                        <span>Startgeld</span><span className="font-black text-white">{fmtEuro(fee)}</span>
                      </div>
                      {isMember && fee > 0 ? (
                        <div className="mt-2 flex items-center justify-between text-sm font-semibold text-white/45">
                          <span>Dein Guthaben</span><span className="font-black text-emerald-200">{fmtEuro(balance)}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className={`mt-4 grid gap-3 ${isMember && fee > 0 ? "sm:grid-cols-2" : ""}`}>
                      <button type="button" onClick={() => void registerSelectedIdentity("on_site")} disabled={registering}
                        className="min-h-[60px] rounded-2xl bg-orange-500 px-5 text-sm font-black text-white disabled:opacity-40">
                        {registering ? "Wird angemeldet …" : fee > 0 ? `Vor Ort bezahlen · ${fmtEuro(fee)}` : "Kostenlos anmelden"}
                      </button>
                      {isMember && fee > 0 ? (
                        <button type="button" onClick={() => void registerSelectedIdentity("credit")}
                          disabled={registering || balance < fee}
                          className="min-h-[60px] rounded-2xl border border-emerald-300/20 bg-emerald-500/[0.07] px-5 text-sm font-black text-emerald-100 disabled:opacity-35">
                          {balance >= fee ? `Mit Guthaben bezahlen · ${fmtEuro(balance)}` : `Guthaben ${fmtEuro(balance)} · zu wenig`}
                        </button>
                      ) : null}
                    </div>
                  </>
                )}

                {memberUnregisterMessage ? (
                  <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/[0.06] px-4 py-3 text-center text-sm font-bold text-emerald-100/75">
                    {memberUnregisterMessage}
                  </div>
                ) : null}
                {resultError ? (
                  <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-500/[0.06] px-4 py-3 text-center text-sm font-bold text-red-100/70">
                    {resultError}
                  </div>
                ) : null}

                <button type="button" onClick={() => { setTerminalIdentity(null); setTerminalEventContext(null); }}
                  className="mt-5 min-h-[50px] w-full rounded-2xl border border-white/10 bg-white/[0.025] text-xs font-black uppercase tracking-[0.14em] text-white/40">
                  Anderes Profil auswählen
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    )
  }


  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.42),rgba(4,6,9,.84)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.16),transparent_28%),radial-gradient(circle_at_100%_82%,rgba(14,165,233,.11),transparent_30%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink
              href="/terminal/menu"
              label="Hauptmenü wird geöffnet"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>

            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
                <Sparkles className="h-4 w-4" />
                EMD Club Terminal
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Turnier-Anmeldung
              </h1>
              <div className="mt-1 text-sm font-semibold text-white/38">
                Öffentliche Turniere & Serien · interne Termine nur mit Mitgliedspaket
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unlockedMemberIdentity ? (
              <button
                type="button"
                onClick={lockMemberEvents}
                className="flex h-12 items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/[0.06] px-4 text-sm font-black text-emerald-100"
              >
                <BadgeCheck className="h-4 w-4" />
                {memberAccessName || "Mitglied"} · intern aktiv
                <X className="h-4 w-4 opacity-60" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAccessUnlockOpen(true)}
                className="flex h-12 items-center gap-2 rounded-2xl border border-orange-300/20 bg-orange-500/[0.06] px-4 text-sm font-black text-orange-100"
              >
                <KeyRound className="h-4 w-4" />
                Interne Turniere
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadEvents(true)}
              disabled={refreshing}
              className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-black text-white/55 backdrop-blur-xl disabled:opacity-35"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
          </div>
        </header>

        <section className="mt-8">
          {todayEvents.length ? (
            <>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300/65">
                    Heute
                  </div>
                  <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">
                    Heute anmelden
                  </h2>
                </div>
                <Target className="h-9 w-9 text-orange-300/35" />
              </div>
              <div className="grid gap-4">
                {todayEvents.map((event) => eventCard(event, true))}
              </div>
            </>
          ) : null}

          <div className={todayEvents.length ? "mt-10" : ""}>
            <div className="mb-4">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/40">
                Kommende Turniere
              </div>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">
                Turnier auswählen
              </h2>
            </div>

            {!initialLoadDone ? (
              <div className="min-h-[180px]" aria-busy="true" />
            ) : upcomingEvents.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {upcomingEvents.map((event) => eventCard(event, false))}
              </div>
            ) : todayEvents.length === 0 ? (
              <div className="rounded-[32px] border border-white/10 bg-black/28 p-8 text-center backdrop-blur-2xl">
                <Users className="mx-auto h-10 w-10 text-white/20" />
                <div className="mt-4 text-xl font-black text-white/70">
                  Aktuell keine offenen Turniere
                </div>
                <div className="mt-2 text-sm font-semibold text-white/30">
                  Sobald ein EMD-Turnier zur Anmeldung bereitsteht, erscheint es automatisch hier.
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {accessUnlockOpen ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <div className="w-full max-w-4xl">
              <TerminalIdentityAuth
                title="Mitgliederzugang"
                subtitle="Name eingeben und mit deiner PIN oder deinem Muster bestätigen. Danach werden auch die internen Turniere deines Pakets angezeigt."
                allowedKinds={["member"]}
                onVerified={unlockMemberEventsWithIdentity}
                onCancel={() => setAccessUnlockOpen(false)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
