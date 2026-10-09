"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowLeft, CheckCircle2, Delete, KeyRound, Search, UserRound, X } from "lucide-react"
import PatternPad from "@/components/terminal/PatternPad"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export type TerminalIdentity = {
  identity_kind: "member" | "guest"
  identity_id: string
  player_id: string | null
  spieldatenbank_id: string | null
  name: string
  photo_url: string | null
  auth_method: "pin" | "pattern"
  has_terminal_auth: boolean
}

export type VerifiedTerminalIdentity = TerminalIdentity & {
  secret: string
}

type Props = {
  title?: string
  subtitle?: string
  allowedKinds?: Array<"member" | "guest">
  onVerified: (identity: VerifiedTerminalIdentity) => void | Promise<void>
  onCancel?: () => void
  compact?: boolean
  initialIdentity?: TerminalIdentity | null
  lockIdentity?: boolean
}

export default function TerminalIdentityAuth({
  title = "Wer bist du?",
  subtitle = "Name eingeben, Profil auswählen und bestätigen.",
  allowedKinds = ["member", "guest"],
  onVerified,
  onCancel,
  compact = false,
  initialIdentity = null,
  lockIdentity = false,
}: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TerminalIdentity[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TerminalIdentity | null>(null)
  const [pin, setPin] = useState("")
  const [pattern, setPattern] = useState<number[]>([])
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!initialIdentity) return
    // Re-check against Supabase: a locally stored facial profile is never trusted for auth method or current account status.
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("terminal_search_identities", { p_query: initialIdentity.name })
        if (error) throw error
        const current = ((data || []) as TerminalIdentity[]).find(p => p.identity_kind === initialIdentity.identity_kind && p.identity_id === initialIdentity.identity_id && allowedKinds.includes(p.identity_kind))
        if (!cancelled) {
          if (current?.has_terminal_auth) { setSelected(current); setMessage("") }
          else setMessage("Profil nicht mehr verfügbar oder keine PIN eingerichtet. Bitte manuell anmelden.")
        }
      } catch { if (!cancelled) setMessage("Profilprüfung fehlgeschlagen. Bitte manuell anmelden.") }
    })()
    return () => { cancelled = true }
  }, [initialIdentity?.identity_id, initialIdentity?.identity_kind])


  useEffect(() => {
    if (selected) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setMessage("")
      return
    }

    const timer = window.setTimeout(async () => {
      setSearching(true)
      setMessage("")
      try {
        const { data, error } = await supabase.rpc("terminal_search_identities", {
          p_query: q,
        })
        if (error) throw error
        const rows = ((data || []) as TerminalIdentity[]).filter((row) =>
          allowedKinds.includes(row.identity_kind),
        )
        setResults(rows)
        if (!rows.length) setMessage("Kein passendes Profil gefunden.")
      } catch (error) {
        console.error("Terminal identity search error:", error)
        setResults([])
        setMessage("Spielersuche konnte nicht geladen werden.")
      } finally {
        setSearching(false)
      }
    }, 220)

    return () => window.clearTimeout(timer)
  }, [query, selected, allowedKinds.join("|")])

  const resetSelection = () => {
    setSelected(null)
    setPin("")
    setPattern([])
    setMessage("")
  }

  const verify = async () => {
    if (!selected || checking) return
    const secret =
      selected.auth_method === "pattern" ? pattern.join("-") : pin
    if (selected.auth_method === "pin" && !/^\d{4}$/.test(secret)) return
    if (selected.auth_method === "pattern" && pattern.length < 4) return

    setChecking(true)
    setMessage("")
    try {
      const { data, error } = await supabase.rpc("terminal_verify_identity", {
        p_identity_kind: selected.identity_kind,
        p_identity_id: selected.identity_id,
        p_method: selected.auth_method,
        p_secret: secret,
      })

      if (error) {
        const msg = String(error.message || "").toLowerCase()
        setMessage(
          msg.includes("rate limited")
            ? "Zu viele Fehlversuche. Bitte 10 Minuten warten."
            : "Bestätigung fehlgeschlagen.",
        )
        return
      }

      const row = Array.isArray(data) ? data[0] : null
      if (!row?.identity_id) {
        setMessage(
          selected.auth_method === "pattern"
            ? "Muster nicht erkannt."
            : "PIN nicht erkannt.",
        )
        setPin("")
        setPattern([])
        return
      }

      await onVerified({ ...selected, ...row, secret })
    } catch (error) {
      console.error("Terminal identity verify error:", error)
      setMessage("Bestätigung konnte nicht geprüft werden.")
    } finally {
      setChecking(false)
    }
  }

  if (selected) {
    return (
      <div className={`mx-auto w-full ${compact ? "max-w-2xl" : "max-w-4xl"}`}>
        {!lockIdentity && <button
          type="button"
          onClick={resetSelection}
          className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white/50"
        >
          <ArrowLeft className="h-4 w-4" /> Anderes Profil
        </button>}

        <div className="rounded-[34px] border border-orange-300/20 bg-black/35 p-6 backdrop-blur-2xl sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-orange-300/20 bg-orange-500/10">
              {selected.photo_url ? (
                <img src={selected.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-8 w-8 text-orange-300" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300/65">
                {selected.identity_kind === "member" ? "EMD-Mitglied" : "Gast"}
              </div>
              <div className="mt-1 text-3xl font-black tracking-[-0.045em] text-white">
                {selected.name}
              </div>
            </div>
          </div>

          {!selected.has_terminal_auth ? (
            <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-500/[0.07] p-5 text-sm font-semibold text-amber-100/80">
              Für dieses Profil wurde noch keine Terminal-Anmeldung eingerichtet.
              Bitte zuerst im eigenen Profil PIN oder Muster festlegen.
            </div>
          ) : selected.auth_method === "pattern" ? (
            <div className="mt-7">
              <div className="mb-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                  Entsperrmuster
                </div>
                <div className="mt-1 text-2xl font-black text-white">
                  Muster zeichnen
                </div>
              </div>
              <PatternPad value={pattern} onChange={setPattern} />
            </div>
          ) : (
            <div className="mt-7">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                Persönliche PIN
              </div>
              <div className="mt-4 flex justify-center gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                      index < pin.length
                        ? "border-orange-300/30 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${index < pin.length ? "bg-orange-300" : "bg-white/10"}`} />
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-6 grid max-w-[420px] grid-cols-3 gap-3">
                {["1","2","3","4","5","6","7","8","9"].map((digit) => (
                  <button key={digit} type="button" onClick={() => pin.length < 4 && setPin(pin + digit)}
                    className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-2xl font-black text-white active:scale-95">
                    {digit}
                  </button>
                ))}
                <button type="button" onClick={() => setPin("")}
                  className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] text-white/35">
                  <X className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => pin.length < 4 && setPin(pin + "0")}
                  className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-2xl font-black text-white active:scale-95">
                  0
                </button>
                <button type="button" onClick={() => setPin(pin.slice(0,-1))}
                  className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] text-white/45">
                  <Delete className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {message ? (
            <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-500/[0.06] px-4 py-3 text-center text-sm font-bold text-red-100/70">
              {message}
            </div>
          ) : null}

          {selected.has_terminal_auth ? (
            <button
              type="button"
              onClick={() => void verify()}
              disabled={
                checking ||
                (selected.auth_method === "pin" ? pin.length !== 4 : pattern.length < 4)
              }
              className="mx-auto mt-6 flex min-h-[60px] w-full max-w-[420px] items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-35"
            >
              {checking ? "Wird geprüft …" : (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Bestätigen
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={`mx-auto w-full ${compact ? "max-w-2xl" : "max-w-4xl"}`}>
      <div className="rounded-[34px] border border-white/10 bg-black/35 p-6 backdrop-blur-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300/70">
              Terminal-Anmeldung
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              {title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/45">
              {subtitle}
            </p>
          </div>
          {onCancel ? (
            <button type="button" onClick={onCancel}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/45">
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Vor- oder Nachname eingeben …"
            className="h-16 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-12 pr-4 text-lg font-bold text-white outline-none placeholder:text-white/25 focus:border-orange-300/35"
          />
        </div>

        <div className="mt-4 grid gap-3">
          {searching ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-5 text-center text-sm font-semibold text-white/35">
              Suche …
            </div>
          ) : results.map((person) => (
            <button
              key={`${person.identity_kind}:${person.identity_id}`}
              type="button"
              onClick={() => {
                setSelected(person)
                setMessage("")
              }}
              className="flex min-h-[76px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-left transition hover:border-orange-300/25 hover:bg-orange-500/[0.05] active:scale-[.995]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                {person.photo_url ? (
                  <img src={person.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-6 w-6 text-white/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-black text-white">{person.name}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                  {person.identity_kind === "member" ? "EMD-Mitglied" : "Gast"}
                  {" · "}
                  {person.has_terminal_auth
                    ? person.auth_method === "pattern"
                      ? "Muster"
                      : "PIN"
                    : "noch nicht eingerichtet"}
                </div>
              </div>
              <KeyRound className="h-5 w-5 text-orange-300/60" />
            </button>
          ))}
        </div>

        {message ? (
          <div className="mt-4 text-center text-sm font-semibold text-white/40">{message}</div>
        ) : null}
        {query.trim().length < 2 ? (
          <div className="mt-4 text-center text-xs font-semibold text-white/25">
            Mindestens 2 Buchstaben eingeben.
          </div>
        ) : null}
      </div>
    </div>
  )
}
