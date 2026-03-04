"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Info,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  UserPlus,
  Wallet,
} from "lucide-react"

type Message = { type: "success" | "error"; text: string } | null

function parseGermanShortDate(dateString: string): Date | null {
  const months: Record<string, number> = {
    "Jan.": 0,
    Jan: 0,
    "Feb.": 1,
    Feb: 1,
    "Mär.": 2,
    Mär: 2,
    "Mar.": 2,
    Mar: 2,
    "Apr.": 3,
    Apr: 3,
    Mai: 4,
    "Jun.": 5,
    Jun: 5,
    Juni: 5,
    "Jul.": 6,
    Jul: 6,
    Juli: 6,
    "Aug.": 7,
    Aug: 7,
    "Sep.": 8,
    Sep: 8,
    "Okt.": 9,
    Okt: 9,
    "Oct.": 9,
    Oct: 9,
    "Nov.": 10,
    Nov: 10,
    "Dez.": 11,
    Dez: 11,
    "Dec.": 11,
    Dec: 11,
  }

  const parts = dateString.trim().split(/\s+/)
  if (parts.length < 3) return null

  const day = Number.parseInt(parts[0].replace(".", ""), 10)
  const monthKey = parts[1]
  const year = Number.parseInt(parts[2], 10)
  const month = months[monthKey]
  if (!Number.isFinite(day) || !Number.isFinite(year) || month === undefined) return null
  return new Date(year, month, day, 0, 0, 0, 0)
}

function formatMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return v.toFixed(2)
}

async function getCreditBalance(creditAccountId: string): Promise<number> {
  // NICHT .single() -> 406 bei "keine Zeile"
  const { data, error } = await supabase.from("player_credits").select("credit_balance").eq("player_id", creditAccountId).limit(1)
  if (error) return 0
  const row = (data ?? [])[0] as any
  const bal = Number(row?.credit_balance ?? 0)
  return Number.isFinite(bal) ? bal : 0
}

async function tryUpdatePlayerCredits(creditAccountId: string, newBalance: number) {
  try {
    await supabase.from("player_credits").update({ credit_balance: newBalance, updated_at: new Date().toISOString() }).eq("player_id", creditAccountId)
  } catch {
    // ignore
  }
}

/**
 * WICHTIG (nach deinem Screenshot):
 * dko_tournament_registration.player_id ist UUID (club_players.id)
 * players.id ist NICHT UUID (spieldatenbank_id / int)
 *
 * -> Daher:
 * - registrationPlayerId = club_players.id (uuid)   (für dko_tournament_registration)
 * - spieldbId           = club_players.spieldatenbank_id (int) (nur für Name aus players)
 * - creditAccountId     = club_players.id (uuid)   (für player_credits & credit_transactions)
 */
export function DKOSelfRegistrationModal(props: {
  isOpen: boolean
  onClose: () => void
  title?: string
  dateLabel?: string
  timeLabel?: string
  onRegistrationChanged?: (isRegistered: boolean) => void

  seriesId?: string | null
  startgeld?: number | null

  canUnregister?: boolean
  unregisterDisabledReason?: string | null
  transactionLabel?: string | null
}) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [busy, setBusy] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const [registrationPlayerId, setRegistrationPlayerId] = useState<string | null>(null) // UUID (club_players.id)
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null) // UUID (club_players.id)
  const [spieldbId, setSpieldbId] = useState<string | null>(null) // spieldatenbank.id (uuid)

  const [playerName, setPlayerName] = useState<string>("")
  const [spieldbName, setSpieldbName] = useState<string>("")
  const [resolvedStartgeld, setResolvedStartgeld] = useState<number>(0)

  const [creditBalance, setCreditBalance] = useState<number>(0)

  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [latestReg, setLatestReg] = useState<{
    entry_fee: number
    paid: boolean
    deducted_from_credit: boolean
    payment_method: "on_site" | "credit" | "admin" | null
  } | null>(null)

  const [paymentMode, setPaymentMode] = useState<"on_site" | "credit">("on_site")

  const canUseCredit = useMemo(() => {
    return Number(creditBalance ?? 0) >= Number(resolvedStartgeld ?? 0) && Number(resolvedStartgeld ?? 0) > 0
  }, [creditBalance, resolvedStartgeld])

  const parsedDate = useMemo(() => {
    if (!props.dateLabel) return null
    return parseGermanShortDate(props.dateLabel)
  }, [props.dateLabel])

  const datePretty = useMemo(() => {
    if (parsedDate) return parsedDate.toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "2-digit" })
    if (props.dateLabel) return props.dateLabel
    return ""
  }, [parsedDate, props.dateLabel])

  const timePretty = useMemo(() => props.timeLabel ?? "", [props.timeLabel])

  // Initial load when modal opens
  useEffect(() => {
    if (!props.isOpen) return
    const run = async () => {
      setMessage(null)
      setInitLoading(true)

      try {
        if (!user?.id) {
          setRegistrationPlayerId(null)
          setCreditAccountId(null)
          setSpieldbId(null)
          setPlayerName("")
          setCreditBalance(0)
          setAlreadyRegistered(false)
          setLatestReg(null)
          return
        }

        // user_profiles -> club_players(id uuid, spieldatenbank_id uuid, name text)
        const { data: profile, error: profErr } = await supabase
          .from("user_profiles")
          .select("club_players(id, spieldatenbank_id, name)")
          .eq("user_id", user.id)
          .maybeSingle()

        if (profErr) throw profErr

        const clubRel: any = (profile as any)?.club_players ?? null

        // Supabase kann Relationen als Array oder Objekt liefern
        const club = Array.isArray(clubRel) ? clubRel?.[0] : clubRel
        const clubId: string | null = club?.id ?? null
        const sId: string | null = club?.spieldatenbank_id ?? null

        setRegistrationPlayerId(sId ? String(sId) : null)
        setCreditAccountId(clubId)
        setSpieldbId(sId ? String(sId) : null)

        // Name: 1) players via spieldatenbank_id (INT) 2) club_players.name 3) metadata/email
        let finalName = ""
        if (sId !== null && sId !== undefined) {
          const { data: p, error: pErr } = await supabase.from("spieldatenbank").select("name").eq("id", sId).maybeSingle()
          if (!pErr && p) {
            finalName = String((p as any).name || "").trim()
          }
        }
        setSpieldbName(finalName)
        if (!finalName) finalName = String(club?.name || "")
        if (!finalName) {
          const meta: any = (user as any)?.user_metadata ?? {}
          finalName =
            String(meta.full_name || meta.display_name || meta.name || meta.username || "") ||
            (user?.email ? user.email.split("@")[0] : "")
        }
        setPlayerName(finalName)

        // Startgeld
        const feeFromProp = Number(props.startgeld ?? NaN)
        if (Number.isFinite(feeFromProp) && feeFromProp >= 0) {
          setResolvedStartgeld(feeFromProp)
        } else if (props.seriesId) {
          const { data: s, error: sErr } = await supabase.from("dko_series").select("startgeld").eq("id", props.seriesId).limit(1)
          if (sErr) throw sErr
          const row = (s ?? [])[0] as any
          const sg = Number(row?.startgeld ?? 0)
          setResolvedStartgeld(Number.isFinite(sg) ? sg : 0)
        } else {
          setResolvedStartgeld(0)
        }

        // Guthaben (nur wenn clubId da ist)
        if (sId) {
          const bal = await getCreditBalance(clubId)
          setCreditBalance(bal)
        } else {
          setCreditBalance(0)
        }

        // Registration (player_id = spieldatenbank.id UUID)
        if (sId) {
          const { data: reg, error: regErr } = await supabase
            .from("dko_tournament_registration")
            .select("id, paid, entry_fee, deducted_from_credit, payment_method, created_at")
            .eq("player_id", String(sId))
            .order("created_at", { ascending: false })
            .limit(1)
          if (regErr) throw regErr
          const row = (reg ?? [])[0] as any
          const isReg = !!row
          setAlreadyRegistered(isReg)
          setLatestReg(
            row
              ? {
                  entry_fee: Number(row.entry_fee ?? 0),
                  paid: row.paid === true,
                  // defensive: in case old rows stored text
                  deducted_from_credit:
                    row.deducted_from_credit === true ||
                    row.deducted_from_credit === "true" ||
                    row.deducted_from_credit === "t" ||
                    row.deducted_from_credit === 1 ||
                    row.deducted_from_credit === "1",
                  payment_method: (row.payment_method as any) ?? null,
                }
              : null
          )
          props.onRegistrationChanged?.(isReg)
        } else {
          setAlreadyRegistered(false)
          setLatestReg(null)
          props.onRegistrationChanged?.(false)
        }

        setPaymentMode("on_site")
      } catch (e: any) {
        console.error(e)
        setMessage({ type: "error", text: e?.message ?? "Fehler beim Laden." })
      } finally {
        setInitLoading(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isOpen, user?.id, props.seriesId, props.startgeld])

  const doLogin = () => {
    props.onClose()
    router.push("/member-login")
  }

  const doLogout = async () => {
    try {
      await supabase.auth.signOut()
      props.onClose()
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  const doRegister = async () => {
    if (!registrationPlayerId) return
    setBusy(true)
    setMessage(null)

    // 🔒 Doppel-Anmeldung verhindern (player_id = spieldatenbank.id)
    try {
      const { data: existingRegs, error: exErr } = await supabase
        .from("dko_tournament_registration")
        .select("id")
        .eq("player_id", registrationPlayerId)
        .limit(1)

      if (exErr) throw exErr
      if ((existingRegs?.length ?? 0) > 0) {
        setAlreadyRegistered(true)
        setMessage({ type: "info" as any, text: "Du bist bereits angemeldet." })
        props.onRegistrationChanged?.(true)
        return
      }
    } catch (e) {
      console.error("[self-reg] existing registration check failed:", e)
    }

    try {
      const fee = Number(resolvedStartgeld ?? 0)

      if (paymentMode === "credit") {
        if (!creditAccountId) {
          setMessage({ type: "error", text: "Kein Guthabenkonto gefunden." })
          return
        }

        const currentBalance = await getCreditBalance(creditAccountId)
        if (!(currentBalance >= fee && fee > 0)) {
          setMessage({ type: "error", text: "Nicht genügend Guthaben." })
          return
        }

        const newBalance = currentBalance - fee

        // ✅ player_id = clubId UUID
        const baseRegPayload: any = {
          player_id: registrationPlayerId,
          player_name: (spieldbName || playerName) || null,
          paid: true,
          entry_fee: fee,
          deducted_from_credit: true,
          payment_method: "credit",
        }
        if (spieldbId !== null && spieldbId !== undefined) baseRegPayload.spieldatenbank_id = spieldbId

        let regInsErr: any = null
        try {
          const { error } = await supabase.from("dko_tournament_registration").insert(baseRegPayload)
          regInsErr = error
        } catch (e) {
          regInsErr = e
        }

        if (regInsErr && String(regInsErr?.message || regInsErr).toLowerCase().includes("spieldatenbank_id")) {
          delete baseRegPayload.spieldatenbank_id
          const { error } = await supabase.from("dko_tournament_registration").insert(baseRegPayload)
          regInsErr = error
        }

        if (regInsErr) throw regInsErr

        // Guthaben-Buchung
        const { error: txErr } = await supabase.from("credit_transactions").insert({
          player_id: creditAccountId,
          amount: -fee,
          balance_after: newBalance,
          transaction_type: "tournament_entry_fee",
          admin_id: null,
        })
        if (txErr) throw txErr

        await tryUpdatePlayerCredits(creditAccountId, newBalance)
        setCreditBalance(newBalance)

        setAlreadyRegistered(true)
        setLatestReg({ entry_fee: fee, paid: true, deducted_from_credit: true, payment_method: "credit" })
        props.onRegistrationChanged?.(true)
        setMessage({ type: "success", text: "Erfolgreich angemeldet." })
      } else {
        // Vor Ort
        const baseRegPayload: any = {
          player_id: registrationPlayerId,
          player_name: (spieldbName || playerName) || null,
          paid: false,
          entry_fee: fee,
          deducted_from_credit: false,
          payment_method: "on_site",
        }
        if (spieldbId !== null && spieldbId !== undefined) baseRegPayload.spieldatenbank_id = spieldbId

        let regErr: any = null
        try {
          const { error } = await supabase.from("dko_tournament_registration").insert(baseRegPayload)
          regErr = error
        } catch (e) {
          regErr = e
        }

        if (regErr && String(regErr?.message || regErr).toLowerCase().includes("spieldatenbank_id")) {
          delete baseRegPayload.spieldatenbank_id
          const { error } = await supabase.from("dko_tournament_registration").insert(baseRegPayload)
          regErr = error
        }

        if (regErr) throw regErr

        setAlreadyRegistered(true)
        setLatestReg({ entry_fee: fee, paid: false, deducted_from_credit: false, payment_method: "on_site" })
        props.onRegistrationChanged?.(true)
        setMessage({ type: "success", text: "Erfolgreich angemeldet." })
      }
    } catch (e: any) {
      console.error(e)
      setMessage({ type: "error", text: e?.message ?? "Fehler bei der Anmeldung." })
    } finally {
      setBusy(false)
    }
  }

  const doUnregister = async () => {
    if (!registrationPlayerId) return
    setBusy(true)
    setMessage(null)

    let refunded = false

    try {
      const canUnreg = props.canUnregister ?? true
      if (!canUnreg) {
        setMessage({ type: "error", text: props.unregisterDisabledReason ?? "Abmeldung ist nicht mehr möglich." })
        return
      }

      // letzte Registrierung holen (für payment_method)
      const { data: regRows, error: regFetchErr } = await supabase
        .from("dko_tournament_registration")
        .select("id, entry_fee, payment_method")
        .eq("player_id", registrationPlayerId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (regFetchErr) throw regFetchErr
      const regRow = (regRows ?? [])[0] as any

      // 🔒 Wenn Admin vor Ort angemeldet hat (payment_method = 'admin'), darf der Spieler sich NICHT selbst abmelden
      if (regRow?.payment_method === "admin") {
        setMessage({ type: "error", text: "Du wurdest vor Ort angemeldet. Bitte wende dich zum Abmelden an die Turnierleitung." })
        props.onRegistrationChanged?.(true)
        return
      }

      // löschen
      const { error: delErr } = await supabase.from("dko_tournament_registration").delete().eq("id", regRow.id)
      if (delErr) throw delErr

      setAlreadyRegistered(false)
      props.onRegistrationChanged?.(false)

      // ✅ RÜCKERSTATTUNG NUR wenn payment_method = 'credit'
      if (regRow?.payment_method === "credit") {
        if (!creditAccountId) {
          setMessage({ type: "error", text: "Abmeldung ok, aber kein Guthabenkonto gefunden für Rückerstattung." })
        } else {
          const fee = Number(regRow?.entry_fee ?? 0)
          if (fee > 0) {
            const currentBalance = await getCreditBalance(creditAccountId)
            const newBalance = currentBalance + fee

            const { error: txErr } = await supabase.from("credit_transactions").insert({
              player_id: creditAccountId,
              amount: fee,
              balance_after: newBalance,
              transaction_type: "tournament_refund",
              admin_id: null,
            })
            if (txErr) throw txErr

            await tryUpdatePlayerCredits(creditAccountId, newBalance)
            setCreditBalance(newBalance)
            refunded = true
          }
        }
      }

      setAlreadyRegistered(false)
      setLatestReg(null)
      props.onRegistrationChanged?.(false)
      setMessage({
        type: "success",
        text: refunded
          ? `Abmeldung erfolgreich. ${formatMoney(Number(regRow?.entry_fee ?? 0))} € wurden deinem Guthaben gutgeschrieben.`
          : "Abmeldung erfolgreich.",
      })
    } catch (e: any) {
      console.error(e)
      setMessage({ type: "error", text: e?.message ?? "Fehler bei der Abmeldung." })
    } finally {
      setBusy(false)
    }
  }

  const refundAmount = useMemo(() => {
    if (latestReg?.payment_method !== "credit") return 0
    const v = Number(latestReg?.entry_fee ?? resolvedStartgeld ?? 0)
    return Number.isFinite(v) ? v : 0
  }, [latestReg, resolvedStartgeld])

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl border border-orange-200">
        {/* Accent bar */}
        <div
          className={`h-1.5 ${
            alreadyRegistered
              ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600"
              : "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600"
          }`}
        />

        <div className="p-4 sm:p-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
                  alreadyRegistered ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"
                }`}
              >
                <UserPlus className={`h-5 w-5 ${alreadyRegistered ? "text-emerald-700" : "text-orange-700"}`} />
              </div>

              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black text-gray-900 truncate">{props.title ?? "Anmeldung"}</div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    LION CUP
                  </span>

                  {alreadyRegistered ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-black">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Angemeldet
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-800 border border-gray-200 px-2 py-0.5 text-[11px] font-black">
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                      Anmeldung
                    </span>
                  )}
                </div>
              </div>
            </DialogTitle>

            <DialogDescription asChild>
              <div className="text-sm text-gray-600">
                {(datePretty || timePretty) ? (
                  <div className="flex flex-col gap-1">
                    {datePretty ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-gray-800">{datePretty}</span>
                      </div>
                    ) : null}
                    {timePretty ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-gray-800">{timePretty}</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span />
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="mt-4">
            {authLoading || initLoading ? (
              <div className="py-10 flex items-center justify-center gap-3 text-gray-700">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-semibold">Lade…</span>
              </div>
            ) : !user ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 flex items-start gap-3">
                  <Lock className="h-5 w-5 mt-0.5 text-orange-700" />
                  <div>
                    <div className="font-black">Bitte einloggen</div>
                    <div className="text-orange-900/80">Du musst eingeloggt sein, um dich anzumelden.</div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={props.onClose} className="rounded-xl">
                    Schließen
                  </Button>
                  <Button onClick={doLogin} className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Wallet cards */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-gray-900">
                      <Wallet className="h-4 w-4 text-orange-600" />
                      Startgeld
                    </div>
                    <div className="font-black text-gray-900">{formatMoney(resolvedStartgeld)} €</div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-gray-900">
                      <Coins className="h-4 w-4 text-orange-600" />
                      Guthaben
                    </div>
                    <div className="font-black text-gray-900">{formatMoney(creditBalance)} €</div>
                  </div>
                </div>

                {/* Payment selection */}
                {!alreadyRegistered ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                    <div className="font-black text-gray-900">Bezahlung</div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("on_site")}
                        className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          paymentMode === "on_site"
                            ? "border-orange-200 bg-orange-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-gray-900">Vor Ort bezahlen</span>
                          {paymentMode === "on_site" && <CheckCircle className="h-4 w-4 text-orange-700" />}
                        </div>
                        <div className="text-gray-600 mt-1">Du zahlst beim Turnierabend.</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMode("credit")}
                        disabled={!canUseCredit}
                        className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          paymentMode === "credit"
                            ? "border-orange-200 bg-orange-50"
                            : "border-gray-200 hover:bg-gray-50"
                        } ${!canUseCredit ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-gray-900">Vom Guthaben abziehen</span>
                          {paymentMode === "credit" && <CheckCircle className="h-4 w-4 text-orange-700" />}
                        </div>
                        <div className="text-gray-600 mt-1">Startgeld wird sofort abgezogen.</div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 flex items-start gap-3">
                    <Info className="h-5 w-5 mt-0.5 text-orange-700" />
                    <div>
                      <div className="font-black">Abmeldung</div>
                      {latestReg?.payment_method === "credit" ? (
                        <>
                          <div className="text-orange-900/80">Bei Abmeldung wird das abgezogene Startgeld automatisch rückerstattet.</div>
                          <div className="mt-1 font-black">Rückerstattung: {formatMoney(refundAmount)} €</div>
                        </>
                      ) : latestReg?.payment_method === "admin" ? (
                        <div className="text-orange-900/80">Du wurdest vor Ort angemeldet. Abmeldung ist nur vor Ort bei der Turnierleitung möglich.</div>
                      ) : (
                        <div className="text-orange-900/80">Du hast „Vor Ort bezahlen“ gewählt. Bei Abmeldung wird nichts abgebucht und es gibt keine Rückerstattung.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Message */}
                {message && (
                  <div
                    className={`rounded-2xl border p-4 text-sm flex items-start gap-3 ${
                      message.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-red-200 bg-red-50 text-red-900"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle className="h-5 w-5 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                    )}
                    <div className="font-semibold">{message.text}</div>
                  </div>
                )}

                {/* Footer buttons */}
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={doLogout} className="rounded-xl">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>

                  <Button variant="outline" onClick={props.onClose} disabled={busy} className="rounded-xl">
                    Schließen
                  </Button>

                  {alreadyRegistered ? (
                    <Button
                      variant="destructive"
                      onClick={doUnregister}
                      disabled={busy || props.canUnregister === false || latestReg?.payment_method === "admin"}
                      className="rounded-xl"
                    >
                      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Abmelden
                    </Button>
                  ) : (
                    <Button onClick={doRegister} disabled={busy} className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black">
                      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Anmelden
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}