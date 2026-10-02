"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  RotateCcw,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react"

type SeriesConfig = {
  id: string
  name: string
  access_type: "public" | "club_internal" | "club_external"
  startgeld: number | null
  registration_enabled: boolean | null
  registration_open_mode: "event_day" | "always"
  registration_open_time: string | null
  registration_close_mode: "fixed_time" | "minutes_before_start"
  registration_close_time: string | null
  unregister_close_mode: "same_as_registration" | "fixed_time" | "minutes_before_start"
  unregister_close_time: string | null
  require_even_participants: boolean | null
  odd_participant_policy: "allow" | "last_waitlist"
  max_participants: number | null
}

type EventRow = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  registration_cutoff_minutes: number | null
  is_matchday: boolean | null
  is_rescheduled: boolean | null
  rescheduled_at: string | null
}

type RegistrationRow = {
  id: number
  player_id: string
  player_name: string
  registered_at: string | null
  paid: boolean | null
  entry_fee: number | null
  deducted_from_credit: boolean | null
  payment_method: "on_site" | "credit" | "admin"
}

type AccountType = "member" | "guest" | "unknown"

function effectiveEventDate(event: EventRow) {
  return new Date(event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at)
}

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function setTimeOnDay(base: Date, value: string | null, fallback: string) {
  const d = new Date(base)
  const [h, m] = String(value || fallback)
    .slice(0, 5)
    .split(":")
    .map(Number)
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
  return d
}

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("de-AT", {
    style: "currency",
    currency: "EUR",
  })
}

function formatDateTime(value: Date) {
  return value.toLocaleString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function getCreditBalance(playerId: string) {
  const { data } = await supabase
    .from("player_credits")
    .select("credit_balance")
    .eq("player_id", playerId)
    .limit(1)

  const balance = Number((data || [])[0]?.credit_balance || 0)
  return Number.isFinite(balance) ? balance : 0
}

async function updateCreditBalance(playerId: string, value: number) {
  await supabase
    .from("player_credits")
    .update({ credit_balance: value, updated_at: new Date().toISOString() })
    .eq("player_id", playerId)
}

export function SeriesRegistration({ seriesId }: { seriesId: string }) {
  const { session } = useAuth() as any

  const [series, setSeries] = useState<SeriesConfig | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])

  const [accountType, setAccountType] = useState<AccountType>("unknown")
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState(0)
  const [accountMessage, setAccountMessage] = useState("")

  const [loading, setLoading] = useState(true)
  const [accountLoading, setAccountLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const loadSeries = async () => {
    const [{ data: seriesData, error: seriesError }, { data: eventData, error: eventError }] =
      await Promise.all([
        supabase
          .from("dko_series")
          .select(
            "id,name,access_type,startgeld,registration_enabled,registration_open_mode,registration_open_time,registration_close_mode,registration_close_time,unregister_close_mode,unregister_close_time,require_even_participants,odd_participant_policy,max_participants",
          )
          .eq("id", seriesId)
          .maybeSingle(),
        supabase
          .from("dko_series_events")
          .select(
            "id,series_id,title,start_at,registration_cutoff_minutes,is_matchday,is_rescheduled,rescheduled_at",
          )
          .eq("series_id", seriesId)
          .eq("is_matchday", true)
          .order("start_at", { ascending: true }),
      ])

    if (seriesError) throw seriesError
    if (eventError) throw eventError

    setSeries(seriesData as SeriesConfig | null)
    setEvents((eventData || []) as EventRow[])
  }

  const currentEvent = useMemo(() => {
    const now = new Date(nowTick)
    const sorted = [...events].sort(
      (a, b) => effectiveEventDate(a).getTime() - effectiveEventDate(b).getTime(),
    )

    return (
      sorted.find((event) => sameLocalDay(effectiveEventDate(event), now)) ||
      sorted.find((event) => effectiveEventDate(event).getTime() >= now.getTime()) ||
      null
    )
  }, [events, nowTick])

  const loadRegistrations = async (eventId?: string | null) => {
    if (!eventId) {
      setRegistrations([])
      return
    }

    const { data, error } = await supabase
      .from("dko_tournament_registration")
      .select("id,player_id,player_name,registered_at,paid,entry_fee,deducted_from_credit,payment_method")
      .eq("series_id", seriesId)
      .eq("event_id", eventId)
      .order("registered_at", { ascending: true })

    if (error) throw error
    setRegistrations((data || []) as RegistrationRow[])
  }

  const detectAccount = async () => {
    setAccountLoading(true)
    setAccountType("unknown")
    setPlayerId(null)
    setPlayerName(null)
    setCreditAccountId(null)
    setCreditBalance(0)
    setAccountMessage("")

    try {
      if (!session?.user?.id) {
        setAccountMessage("Bitte melde dich an, um dich für einen Spieltag anzumelden.")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("club_players(id,spieldatenbank_id,name,is_active)")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const rel: any = (profile as any)?.club_players
      const member = Array.isArray(rel) ? rel?.[0] : rel

      if (member?.spieldatenbank_id && member?.is_active !== false) {
        const spieldbId = String(member.spieldatenbank_id)

        const { data: player } = await supabase
          .from("spieldatenbank")
          .select("id,name")
          .eq("id", spieldbId)
          .maybeSingle()

        setAccountType("member")
        setPlayerId(spieldbId)
        setPlayerName(String(player?.name || member?.name || "Mitglied"))
        setCreditAccountId(String(member.id))

        const balance = await getCreditBalance(String(member.id))
        setCreditBalance(balance)
        return
      }

      const { data: guest, error: guestError } = await supabase
        .from("guest_requests")
        .select("status,linked_spieldatenbank_id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle()

      if (guestError) throw guestError

      if (guest?.status !== "approved" || !guest?.linked_spieldatenbank_id) {
        setAccountMessage("Für deinen Zugang ist derzeit keine Turnieranmeldung freigeschaltet.")
        return
      }

      const { data: guestPlayer, error: guestPlayerError } = await supabase
        .from("spieldatenbank")
        .select("id,name")
        .eq("id", guest.linked_spieldatenbank_id)
        .maybeSingle()

      if (guestPlayerError) throw guestPlayerError
      if (!guestPlayer?.id) {
        setAccountMessage("Dein Gastzugang konnte keinem Spieler zugeordnet werden.")
        return
      }

      setAccountType("guest")
      setPlayerId(String(guestPlayer.id))
      setPlayerName(String(guestPlayer.name || "Gast"))
    } catch (error: any) {
      console.error(error)
      setAccountMessage("Deine Anmeldung konnte nicht vorbereitet werden.")
    } finally {
      setAccountLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function run() {
      setLoading(true)
      try {
        await loadSeries()
      } catch (error: any) {
        if (active) setMessage(error?.message || "Anmeldung konnte nicht geladen werden.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [seriesId])

  useEffect(() => {
    void detectAccount()
  }, [session?.user?.id, seriesId])

  useEffect(() => {
    void loadRegistrations(currentEvent?.id)
  }, [currentEvent?.id, seriesId])

  useEffect(() => {
    if (!currentEvent?.id) return

    const channel = supabase
      .channel(`series-registration-${currentEvent.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dko_tournament_registration" },
        () => void loadRegistrations(currentEvent.id),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentEvent?.id, seriesId])

  const status = useMemo(() => {
    if (!series || !currentEvent) {
      return {
        registrationOpen: false,
        unregisterOpen: false,
        registrationClose: null as Date | null,
        unregisterClose: null as Date | null,
      }
    }

    const start = effectiveEventDate(currentEvent)
    const now = new Date(nowTick)
    const cutoff = Math.max(0, Number(currentEvent.registration_cutoff_minutes || 0))

    let openAt: Date
    if (series.registration_open_mode === "always") {
      openAt = new Date(0)
    } else {
      openAt = setTimeOnDay(start, series.registration_open_time, "00:00")
    }

    let registrationClose: Date
    if (series.registration_close_mode === "fixed_time") {
      registrationClose = setTimeOnDay(start, series.registration_close_time, "17:00")
    } else {
      registrationClose = new Date(start.getTime() - cutoff * 60_000)
    }

    let unregisterClose: Date
    if (series.unregister_close_mode === "fixed_time") {
      unregisterClose = setTimeOnDay(start, series.unregister_close_time, "14:00")
    } else if (series.unregister_close_mode === "minutes_before_start") {
      unregisterClose = new Date(start.getTime() - cutoff * 60_000)
    } else {
      unregisterClose = registrationClose
    }

    const registrationOpen =
      series.registration_enabled !== false &&
      now.getTime() >= openAt.getTime() &&
      now.getTime() <= registrationClose.getTime()

    const unregisterOpen =
      now.getTime() >= openAt.getTime() &&
      now.getTime() <= unregisterClose.getTime()

    return {
      registrationOpen,
      unregisterOpen,
      registrationClose,
      unregisterClose,
    }
  }, [series, currentEvent, nowTick])

  const ownRegistration = useMemo(() => {
    if (!playerId) return null
    return registrations.find((row) => String(row.player_id) === String(playerId)) || null
  }, [registrations, playerId])

  const waitingRegistrationId = useMemo(() => {
    if (
      !series?.require_even_participants ||
      series.odd_participant_policy !== "last_waitlist" ||
      registrations.length === 0 ||
      registrations.length % 2 === 0
    ) {
      return null
    }

    return registrations[registrations.length - 1]?.id || null
  }, [series?.require_even_participants, series?.odd_participant_policy, registrations])

  const ownWaiting = !!ownRegistration && ownRegistration.id === waitingRegistrationId
  const maxReached =
    !!series?.max_participants &&
    registrations.length >= Number(series.max_participants) &&
    !ownRegistration

  const accessAllowed =
    accountType === "member" ||
    (accountType === "guest" && series?.access_type !== "club_internal")

  const hasEntryFee = Number(series?.startgeld || 0) > 0
  const showCreditPayment =
    accountType === "member" &&
    !!creditAccountId &&
    hasEntryFee

  const canUseCredit =
    showCreditPayment &&
    creditBalance >= Number(series?.startgeld || 0)

  async function register(paymentMethod: "on_site" | "credit") {
    if (!series || !currentEvent || !playerId || !playerName) return

    setBusy(true)
    setMessage("")

    try {
      if (!accessAllowed) throw new Error("Für diese Turnierserie ist dein Zugang nicht freigeschaltet.")
      if (!status.registrationOpen) throw new Error("Die Anmeldung ist aktuell nicht geöffnet.")
      if (maxReached) throw new Error("Für diesen Spieltag sind bereits alle Plätze vergeben.")

      const { data: existing, error: existingError } = await supabase
        .from("dko_tournament_registration")
        .select("id")
        .eq("event_id", currentEvent.id)
        .eq("player_id", playerId)
        .limit(1)

      if (existingError) throw existingError
      if ((existing || []).length > 0) {
        await loadRegistrations(currentEvent.id)
        throw new Error("Du bist für diesen Spieltag bereits angemeldet.")
      }

      const fee = Number(series.startgeld || 0)
      let paid = false
      let deducted = false

      if (paymentMethod === "credit") {
        if (!creditAccountId) throw new Error("Kein Guthabenkonto gefunden.")

        const currentBalance = await getCreditBalance(creditAccountId)
        if (currentBalance < fee || fee <= 0) throw new Error("Nicht genügend Guthaben.")

        const newBalance = currentBalance - fee

        const { error: transactionError } = await supabase.from("credit_transactions").insert({
          player_id: creditAccountId,
          amount: -fee,
          balance_after: newBalance,
          transaction_type: "tournament_entry_fee",
          admin_id: null,
          series_id: series.id,
          event_id: currentEvent.id,
          series_name: series.name,
          event_name: currentEvent.title || "Spieltag",
          payment_source: "wallet",
        })

        if (transactionError) throw transactionError

        await updateCreditBalance(creditAccountId, newBalance)
        setCreditBalance(newBalance)
        paid = true
        deducted = true
      }

      const { error } = await supabase.from("dko_tournament_registration").insert({
        player_id: playerId,
        player_name: playerName,
        paid,
        entry_fee: fee,
        deducted_from_credit: deducted,
        payment_method: paymentMethod,
        access_type: series.access_type,
        series_id: series.id,
        event_id: currentEvent.id,
        series_name: series.name,
        event_name: currentEvent.title || "Spieltag",
      })

      if (error) {
        if (paymentMethod === "credit" && creditAccountId && fee > 0) {
          const balance = await getCreditBalance(creditAccountId)
          const restored = balance + fee
          await supabase.from("credit_transactions").insert({
            player_id: creditAccountId,
            amount: fee,
            balance_after: restored,
            transaction_type: "tournament_refund",
            admin_id: null,
            series_id: series.id,
            event_id: currentEvent.id,
            series_name: series.name,
            event_name: currentEvent.title || "Spieltag",
            payment_source: "wallet",
          })
          await updateCreditBalance(creditAccountId, restored)
          setCreditBalance(restored)
        }
        throw error
      }

      await loadRegistrations(currentEvent.id)
      setMessage("Deine Anmeldung wurde gespeichert.")
    } catch (error: any) {
      setMessage(error?.message || "Anmeldung fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  async function unregister() {
    if (!series || !currentEvent || !ownRegistration) return

    setBusy(true)
    setMessage("")

    try {
      if (!status.unregisterOpen) throw new Error("Die Abmeldung ist nicht mehr möglich.")
      if (ownRegistration.payment_method === "admin") {
        throw new Error("Bitte wende dich zum Abmelden an die Turnierleitung.")
      }

      const { error: deleteError } = await supabase
        .from("dko_tournament_registration")
        .delete()
        .eq("id", ownRegistration.id)

      if (deleteError) throw deleteError

      if (
        ownRegistration.payment_method === "credit" &&
        creditAccountId &&
        Number(ownRegistration.entry_fee || 0) > 0
      ) {
        const fee = Number(ownRegistration.entry_fee || 0)
        const currentBalance = await getCreditBalance(creditAccountId)
        const newBalance = currentBalance + fee

        const { error: refundError } = await supabase.from("credit_transactions").insert({
          player_id: creditAccountId,
          amount: fee,
          balance_after: newBalance,
          transaction_type: "tournament_refund",
          admin_id: null,
          series_id: series.id,
          event_id: currentEvent.id,
          series_name: series.name,
          event_name: currentEvent.title || "Spieltag",
          payment_source: "wallet",
        })

        if (refundError) throw refundError

        await updateCreditBalance(creditAccountId, newBalance)
        setCreditBalance(newBalance)
      }

      await loadRegistrations(currentEvent.id)
      setMessage("Du wurdest erfolgreich abgemeldet.")
    } catch (error: any) {
      setMessage(error?.message || "Abmeldung fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  if (loading || !series) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-black/35 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-center gap-2 text-white/45">
          <Loader2 className="h-5 w-5 animate-spin" />
          Anmeldung wird geladen…
        </div>
      </section>
    )
  }

  const capacityText = series.max_participants
    ? `${registrations.length} / ${series.max_participants}`
    : String(registrations.length)
  const registrationStateLabel = ownRegistration
    ? ownWaiting
      ? "Warteposition"
      : "Angemeldet"
    : status.registrationOpen
      ? "Anmeldung offen"
      : "Anmeldung geschlossen"

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-orange-300/[0.12] bg-black/40 p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-orange-500/[0.10] blur-[75px]" />

      <div className="relative">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/15 bg-orange-500/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100/75">
              <UserPlus className="h-3.5 w-3.5" />
              Turnieranmeldung
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">{series.name}</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
              Melde dich für den nächsten Spieltag an oder verwalte deine bestehende Anmeldung.
            </p>
          </div>

          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${
            ownRegistration && !ownWaiting
              ? "border-emerald-300/18 bg-emerald-500/[0.08] text-emerald-100"
              : ownWaiting
                ? "border-amber-300/18 bg-amber-500/[0.08] text-amber-100"
                : status.registrationOpen
                  ? "border-orange-300/18 bg-orange-500/[0.08] text-orange-100"
                  : "border-white/[0.08] bg-white/[0.03] text-white/45"
          }`}>
            <span className={`h-2 w-2 rounded-full ${status.registrationOpen || ownRegistration ? "bg-current" : "bg-white/25"}`} />
            {registrationStateLabel}
          </div>
        </div>

        {!currentEvent ? (
          <div className="mt-5 rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-6 text-center">
            <CalendarDays className="mx-auto h-7 w-7 text-white/20" />
            <div className="mt-3 font-black text-white/75">Kein weiterer Spieltag geplant</div>
            <div className="mt-1 text-sm font-semibold text-white/35">Sobald ein neuer Turniertag feststeht, erscheint er hier.</div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
              <div className="rounded-[24px] border border-orange-300/[0.10] bg-[linear-gradient(135deg,rgba(249,115,22,.08),rgba(255,255,255,.018))] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100/45">Nächster Spieltag</div>
                    <div className="mt-1 truncate text-xl font-black text-white sm:text-2xl">{currentEvent.title || "Spieltag"}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/48">
                      <CalendarDays className="h-4 w-4 text-orange-200/70" />
                      {formatDateTime(effectiveEventDate(currentEvent))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:min-w-[250px]">
                    <CompactFact label="Teilnehmer" value={capacityText} icon={<Users className="h-4 w-4" />} />
                    <CompactFact label="Startgeld" value={formatMoney(series.startgeld)} icon={<WalletCards className="h-4 w-4" />} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <DeadlineCard label="Anmeldeschluss" value={status.registrationClose ? formatDateTime(status.registrationClose) : "—"} icon={<Clock3 className="h-4 w-4" />} active={status.registrationOpen} />
                <DeadlineCard label="Abmeldeschluss" value={status.unregisterClose ? formatDateTime(status.unregisterClose) : "—"} icon={<RotateCcw className="h-4 w-4" />} active={status.unregisterOpen} />
              </div>
            </div>

            {series.require_even_participants && series.odd_participant_policy === "last_waitlist" ? (
              <div className="mt-3 rounded-2xl border border-violet-300/10 bg-violet-500/[0.045] px-4 py-3 text-sm font-semibold text-white/52">
                {registrations.length % 2 === 0
                  ? "Die Teilnehmerzahl ist aktuell gerade."
                  : "Der zuletzt angemeldete Spieler wartet noch auf einen weiteren Teilnehmer."}
              </div>
            ) : null}

            <div className="mt-4">
              {ownRegistration ? (
                <div className={`rounded-[24px] border p-4 sm:p-5 ${
                  ownWaiting
                    ? "border-amber-300/18 bg-amber-500/[0.055]"
                    : "border-emerald-300/16 bg-emerald-500/[0.05]"
                }`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${ownWaiting ? "border-amber-300/15 bg-amber-500/[0.08]" : "border-emerald-300/15 bg-emerald-500/[0.08]"}`}>
                        <CheckCircle2 className={`h-5 w-5 ${ownWaiting ? "text-amber-200" : "text-emerald-200"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-black text-white/92">{ownWaiting ? "Warteposition" : "Anmeldung bestätigt"}</div>
                        <div className="mt-1 truncate text-sm font-semibold text-white/48">{ownRegistration.player_name}</div>
                        <div className="mt-1 text-xs font-semibold text-white/30">
                          {ownWaiting
                            ? "Sobald sich ein weiterer Spieler anmeldet, bist du fix dabei."
                            : ownRegistration.payment_method === "credit"
                              ? "Startgeld wurde mit Guthaben bezahlt."
                              : Number(ownRegistration.entry_fee || 0) > 0
                                ? "Startgeld wird vor Ort bezahlt."
                                : "Teilnahme bestätigt."}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || !status.unregisterOpen}
                      onClick={() => void unregister()}
                      className="h-11 rounded-xl border-red-300/20 bg-red-500/[0.035] px-4 font-black text-red-100 hover:bg-red-500/10"
                    >
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                      Abmelden
                    </Button>
                  </div>
                </div>
              ) : accountLoading ? (
                <div className="flex items-center gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 text-sm font-semibold text-white/45">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-200" />
                  Anmeldung wird vorbereitet…
                </div>
              ) : !session?.user?.id ? (
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                  <div className="font-black text-white/85">Für die Anmeldung einloggen</div>
                  <div className="mt-1 text-sm font-semibold leading-6 text-white/42">{accountMessage}</div>
                  <Button
                    type="button"
                    onClick={() => { window.location.href = "/member-login" }}
                    className="mt-4 h-11 rounded-xl bg-orange-600 px-5 font-black text-white hover:bg-orange-500"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Zum Login
                  </Button>
                </div>
              ) : !accessAllowed ? (
                <StatusMessage tone="warning" text={accountMessage || "Für diese Turnierserie ist dein Zugang nicht freigeschaltet."} />
              ) : !status.registrationOpen ? (
                <StatusMessage
                  tone="neutral"
                  text={series.registration_enabled === false
                    ? "Die Anmeldung für diese Turnierserie ist derzeit geschlossen."
                    : `Die Anmeldung ist aktuell nicht geöffnet.${status.registrationClose ? ` Anmeldeschluss: ${formatDateTime(status.registrationClose)}.` : ""}`}
                />
              ) : maxReached ? (
                <StatusMessage tone="warning" text="Für diesen Spieltag sind bereits alle Plätze vergeben." />
              ) : (
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Anmeldung für</div>
                      <div className="mt-1 text-lg font-black text-white/90">{playerName}</div>
                      <div className="mt-1 text-xs font-semibold text-white/35">{accountType === "member" ? "Vereinsmitglied" : "Gastzugang"}</div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => void register("on_site")}
                        className="h-11 rounded-xl bg-orange-600 px-5 font-black text-white shadow-[0_12px_30px_-16px_rgba(249,115,22,.8)] hover:bg-orange-500"
                      >
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        {Number(series.startgeld || 0) > 0 ? "Anmelden · Zahlung vor Ort" : "Jetzt anmelden"}
                      </Button>

                      {showCreditPayment ? (
                        <Button
                          type="button"
                          disabled={busy || !canUseCredit}
                          onClick={() => void register("credit")}
                          variant="outline"
                          title={
                            canUseCredit
                              ? `Startgeld ${formatMoney(series.startgeld)} vom Guthaben bezahlen`
                              : `Nicht genügend Guthaben. Benötigt: ${formatMoney(series.startgeld)}`
                          }
                          className={`h-11 rounded-xl px-5 font-black ${
                            canUseCredit
                              ? "border-emerald-300/20 bg-emerald-500/[0.055] text-emerald-100 hover:bg-emerald-500/10"
                              : "cursor-not-allowed border-white/[0.08] bg-white/[0.025] text-white/35"
                          }`}
                        >
                          <WalletCards className="mr-2 h-4 w-4" />
                          {canUseCredit
                            ? `Mit Guthaben · ${formatMoney(creditBalance)}`
                            : `Guthaben ${formatMoney(creditBalance)} · zu wenig`}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {message ? (
              <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm font-bold text-white/68">
                {message}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

function CompactFact({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3"><div className="flex items-center gap-1.5 text-white/28">{icon}<span className="text-[9px] font-black uppercase tracking-[0.12em]">{label}</span></div><div className="mt-1.5 text-sm font-black text-white/82">{value}</div></div>
}
function DeadlineCard({ label, value, icon, active }: { label: string; value: string; icon: ReactNode; active: boolean }) {
  return <div className={`rounded-[22px] border p-3.5 ${active ? "border-orange-300/12 bg-orange-500/[0.045]" : "border-white/[0.07] bg-white/[0.02]"}`}><div className="flex items-center gap-1.5 text-white/30">{icon}<span className="text-[9px] font-black uppercase tracking-[0.12em]">{label}</span></div><div className="mt-1.5 text-xs font-black leading-5 text-white/72">{value}</div></div>
}
function StatusMessage({ tone, text }: { tone: "warning" | "neutral"; text: string }) {
  return <div className={`rounded-[22px] border p-4 text-sm font-semibold leading-6 ${tone === "warning" ? "border-amber-300/12 bg-amber-500/[0.05] text-amber-50/72" : "border-white/[0.08] bg-white/[0.025] text-white/50"}`}>{text}</div>
}

