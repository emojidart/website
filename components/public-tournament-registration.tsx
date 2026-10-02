"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Coins, Mail, Phone, UserRound, Users, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

type Props = { eventId: string }
type Info = {
  event: any
  participantCount: number
  participants: { id: string; name: string }[]
  registrationSource?: "central" | "legacy-external"
  centralEventId?: string | null
}

type PrefillType = "guest" | "member" | null

export function PublicTournamentRegistration({ eventId }: Props) {
  const [info, setInfo] = useState<Info | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefillLoading, setPrefillLoading] = useState(true)
  const [prefillType, setPrefillType] = useState<PrefillType>(null)

  const [fullName, setFullName] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)
  const [creditBalance, setCreditBalance] = useState(0)
  const [paymentMode, setPaymentMode] = useState<"on_site" | "credit">("on_site")

  async function load() {
    setLoading(true)
    const r = await fetch(
      `/api/public-tournament-registration?eventId=${encodeURIComponent(eventId)}`,
      { cache: "no-store" },
    )
    const d = await r.json().catch(() => null)
    if (r.ok) setInfo(d)
    setLoading(false)
  }

  async function prefillFromAccount() {
    try {
      setPrefillLoading(true)

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      if (!user) {
        setPrefillType(null)
        setCreditBalance(0)
        setPaymentMode("on_site")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_guest, player_id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileError) {
        console.warn("[PublicTournamentRegistration] Profil konnte nicht geladen werden:", profileError)
      }

      // Gastkonto: vorhandene Daten aus guest_requests übernehmen.
      if (profile?.is_guest) {
        const { data: guest, error: guestError } = await supabase
          .from("guest_requests")
          .select("full_name,player_name,email,phone")
          .eq("auth_user_id", user.id)
          .maybeSingle()

        if (guestError) {
          console.warn("[PublicTournamentRegistration] Gastdaten konnten nicht geladen werden:", guestError)
        }

        if (guest) {
          setFullName((old) => old || guest.full_name || "")
          setPlayerName((old) => old || guest.player_name || "")
          setEmail((old) => old || guest.email || user.email || "")
          setPhone((old) => old || guest.phone || "")
          setPrefillType("guest")
          return
        }
      }

      // Normales Mitglied: Spielername aus club_players, E-Mail aus Auth-Session.
      const { data: memberProfile, error: memberProfileError } = await supabase
        .from("user_profiles")
        .select(`
          player_id,
          club_players (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle()

      if (memberProfileError) {
        console.warn(
          "[PublicTournamentRegistration] Mitgliedsdaten konnten nicht geladen werden:",
          memberProfileError,
        )
      }

      const linkedPlayer = Array.isArray((memberProfile as any)?.club_players)
        ? (memberProfile as any)?.club_players?.[0]
        : (memberProfile as any)?.club_players

      const linkedName = String(linkedPlayer?.name || "").trim()
      const linkedClubPlayerId = linkedPlayer?.id ? String(linkedPlayer.id) : null

      if (linkedClubPlayerId) {
        const { data: creditRow } = await supabase
          .from("player_credits")
          .select("credit_balance")
          .eq("player_id", linkedClubPlayerId)
          .maybeSingle()

        const balance = Number(creditRow?.credit_balance || 0)
        setCreditBalance(Number.isFinite(balance) ? balance : 0)
      } else {
        setCreditBalance(0)
      }

      if (linkedName || user.email) {
        setFullName((old) => old || linkedName)
        setPlayerName((old) => old || linkedName)
        setEmail((old) => old || user.email || "")
        setPrefillType("member")
      }
    } catch (error) {
      // Prefill darf die öffentliche Anmeldung nie blockieren.
      console.warn("[PublicTournamentRegistration] Konto-Prefill fehlgeschlagen:", error)
    } finally {
      setPrefillLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void prefillFromAccount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!info) return

    setSaving(true)
    setMessage("")
    setSuccess(false)

    const entryFee = Math.max(0, Number(info.event?.entry_fee || 0))

    // Eingeloggte Vereinsmitglieder + internes EMD-Turnier:
    // Zahlung/Anmeldung atomar direkt im zentralen Turniersystem.
    if (
      prefillType === "member" &&
      info.registrationSource === "central" &&
      info.centralEventId
    ) {
      const selectedPayment =
        entryFee <= 0 ? "on_site" : paymentMode

      const { data, error } = await supabase.rpc(
        "central_tournament_register_member",
        {
          p_event_id: info.centralEventId,
          p_payment_method: selectedPayment,
        },
      )

      if (error) {
        setMessage(error.message || "Anmeldung fehlgeschlagen.")
        setSaving(false)
        return
      }

      const result = data as any
      if (result?.payment_method === "credit" && result?.balance_after != null) {
        setCreditBalance(Number(result.balance_after))
      }

      setSuccess(true)
      setMessage(
        result?.payment_method === "credit"
          ? `Du bist angemeldet. ${entryFee.toLocaleString("de-AT", { style: "currency", currency: "EUR" })} wurden von deinem Guthaben abgezogen.`
          : entryFee > 0
            ? `Du bist angemeldet. Das Startgeld von ${entryFee.toLocaleString("de-AT", { style: "currency", currency: "EUR" })} wird vor Ort bezahlt.`
            : "Du bist angemeldet.",
      )

      await load()
      setSaving(false)
      return
    }

    // Gäste / öffentliche Anmeldung:
    // Anmeldung landet bei internen EMD-Turnieren ebenfalls zentral,
    // Startgeld wird dynamisch als Zahlung vor Ort gespeichert.
    const r = await fetch("/api/public-tournament-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, fullName, playerName, email, phone }),
    })

    const d = await r.json().catch(() => null)

    if (!r.ok) {
      setMessage(d?.error || "Anmeldung fehlgeschlagen.")
      setSaving(false)
      return
    }

    setSuccess(true)
    setMessage(
      entryFee > 0
        ? `Du bist angemeldet. Das Startgeld von ${entryFee.toLocaleString("de-AT", { style: "currency", currency: "EUR" })} wird vor Ort bezahlt.`
        : "Du bist angemeldet.",
    )
    await load()
    setSaving(false)
  }

  if (loading) {
    return (
      <Card className="mt-6 rounded-3xl">
        <CardContent className="p-6 text-center text-sm text-slate-500">
          Anmeldung wird geladen…
        </CardContent>
      </Card>
    )
  }

  if (!info || info.event.registration_mode !== "public_form") return null

  const full = Boolean(
    info.event.max_participants && info.participantCount >= info.event.max_participants,
  )

  const entryFee = Math.max(0, Number(info.event?.entry_fee || 0))
  const isCentralMember =
    prefillType === "member" &&
    info.registrationSource === "central" &&
    Boolean(info.centralEventId)
  const canUseCredit = isCentralMember && entryFee > 0 && creditBalance >= entryFee

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <Card className="rounded-3xl border-orange-200 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-orange-600">
                Online-Anmeldung
              </div>
              <h2 className="mt-1 text-2xl font-black">Jetzt Platz sichern</h2>
            </div>

            <div className="rounded-2xl bg-orange-50 px-3 py-2 text-center">
              <div className="text-xl font-black text-orange-700">
                {info.participantCount}
                {info.event.max_participants ? ` / ${info.event.max_participants}` : ""}
              </div>
              <div className="text-[11px] font-bold text-orange-600">angemeldet</div>
            </div>
          </div>

          {!info.event.registration_enabled || full ? (
            <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-center font-bold text-slate-700">
              {full
                ? "Das Turnier ist aktuell voll."
                : "Die Online-Anmeldung ist geschlossen."}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
              {prefillType ? (
                <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    Daten aus deinem {prefillType === "guest" ? "Gastkonto" : "Konto"} übernommen
                  </div>
                  <div className="mt-1 text-xs font-semibold text-emerald-700">
                    Bitte kurz prüfen. Du kannst die Angaben vor der Anmeldung noch ändern.
                  </div>
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  Vor- und Nachname *
                </label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 rounded-xl pl-10"
                    disabled={prefillLoading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  Spielername
                </label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="optional"
                  disabled={prefillLoading}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 rounded-xl pl-10"
                    placeholder="optional"
                    disabled={prefillLoading}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600">E-Mail *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl pl-10"
                    disabled={prefillLoading}
                  />
                </div>
              </div>

              <div className="sm:col-span-2 rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <WalletCards className="h-4 w-4 text-orange-600" />
                    Startgeld
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    {entryFee > 0
                      ? entryFee.toLocaleString("de-AT", { style: "currency", currency: "EUR" })
                      : "Kostenlos"}
                  </div>
                </div>

                {entryFee > 0 ? (
                  isCentralMember ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("on_site")}
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          paymentMode === "on_site"
                            ? "border-orange-400 bg-white shadow-sm"
                            : "border-slate-200 bg-white/70 hover:bg-white"
                        }`}
                      >
                        <div className="font-black text-slate-900">Vor Ort bezahlen</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          Anmeldung jetzt, Zahlung beim Turnier.
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={!canUseCredit}
                        onClick={() => setPaymentMode("credit")}
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          paymentMode === "credit"
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : "border-slate-200 bg-white/70"
                        } ${!canUseCredit ? "cursor-not-allowed opacity-45" : "hover:bg-emerald-50"}`}
                      >
                        <div className="flex items-center gap-2 font-black text-slate-900">
                          <Coins className="h-4 w-4 text-emerald-600" />
                          Vom Guthaben
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          Verfügbar: {creditBalance.toLocaleString("de-AT", { style: "currency", currency: "EUR" })}
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs font-semibold text-slate-600">
                      Das Startgeld wird vor Ort bezahlt.
                    </div>
                  )
                ) : (
                  <div className="mt-2 text-xs font-semibold text-emerald-700">
                    Für dieses Turnier ist kein Startgeld hinterlegt.
                  </div>
                )}
              </div>

              {message ? (
                <div
                  className={`sm:col-span-2 rounded-xl border p-3 text-sm font-semibold ${
                    success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {success ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
                  {message}
                </div>
              ) : null}

              <Button
                disabled={saving || prefillLoading}
                className="sm:col-span-2 h-12 rounded-xl bg-orange-600 font-black hover:bg-orange-700"
              >
                {prefillLoading
                  ? "Kontodaten werden geladen…"
                  : saving
                    ? "Wird angemeldet…"
                    : entryFee <= 0
                      ? "Kostenlos anmelden"
                      : isCentralMember && paymentMode === "credit"
                        ? `Anmelden & ${entryFee.toLocaleString("de-AT", { style: "currency", currency: "EUR" })} abbuchen`
                        : "Verbindlich anmelden"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-black">Teilnehmer</h2>
          </div>

          {info.event.show_participants ? (
            <div className="mt-4 space-y-2">
              {info.participants.length ? (
                info.participants.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-800">{p.name}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Noch keine Anmeldungen.</p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Die Teilnehmerliste ist für dieses Turnier nicht öffentlich.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
