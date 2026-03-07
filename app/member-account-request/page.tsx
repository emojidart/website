"use client"

import { useMemo, useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Loader2,
  UserPlus,
  KeyRound,
  Search,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Shield,
} from "lucide-react"

type FormState = {
  code: string
  firstName: string
  lastName: string
  email: string
  password: string
  password2: string
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function normalizeCode(v: string) {
  const raw = String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")

  if (/^QR[A-Z0-9]{7}$/.test(raw)) {
    return `QR-${raw.slice(2, 6)}-${raw.slice(6)}`
  }

  return raw
}

export default function MemberAccountRequestPage() {
  const [form, setForm] = useState<FormState>({
    code: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    password2: "",
  })

  const [submitting, setSubmitting] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [lockedName, setLockedName] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const [status, setStatus] = useState<{
    type: "success" | "error" | "info" | null
    message: string
  }>({
    type: null,
    message: "",
  })

  const canSubmit = useMemo(() => {
    const codeOk = normalizeCode(form.code).length >= 8
    const firstOk = form.firstName.trim().length >= 2
    const emailOk = isValidEmail(form.email)
    const lastOk = lockedName
      ? form.lastName.trim().length === 0 || form.lastName.trim().length >= 2
      : form.lastName.trim().length >= 2
    const pwOk = form.password.length >= 8
    const pwMatch = form.password === form.password2

    return codeOk && firstOk && lastOk && emailOk && pwOk && pwMatch && !submitting
  }, [form, lockedName, submitting])

  const lookupByCode = async () => {
    setStatus({ type: null, message: "" })

    const code = normalizeCode(form.code)
    if (code.length < 8) {
      setLockedName(false)
      setStatus({
        type: "error",
        message: "Bitte gib deinen Mitglieder-Code ein (z.B. QR-T639-P2D).",
      })
      return
    }

    setLookingUp(true)

    try {
      const res = await fetch(`/api/member-account-request?code=${encodeURIComponent(code)}`, {
        method: "GET",
      })

      const data = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(data?.error || "Code nicht gefunden")

      const fullName = String(data?.fullName || "").trim()
      const parts = fullName.split(/\s+/).filter(Boolean)

      let first = ""
      let last = ""

      if (parts.length <= 1) {
        first = parts[0] || fullName
        last = ""
      } else {
        first = parts.slice(0, -1).join(" ")
        last = parts.slice(-1).join(" ")
      }

      setForm((p) => ({
        ...p,
        code,
        firstName: first,
        lastName: last,
      }))
      setLockedName(true)

      setStatus({
        type: "info",
        message: `Code gefunden: ${fullName}. Bitte E-Mail und Passwort eintragen.`,
      })
    } catch (e: any) {
      setLockedName(false)
      setStatus({
        type: "error",
        message: `Code ungültig: ${e?.message || "Unbekannter Fehler"}`,
      })
    } finally {
      setLookingUp(false)
    }
  }

  const submit = async () => {
    setStatus({ type: null, message: "" })

    const code = normalizeCode(form.code)
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password
    const password2 = form.password2

    if (code.length < 8) {
      setStatus({ type: "error", message: "Bitte gib deinen Mitglieder-Code korrekt an." })
      return
    }

    if (firstName.length < 2) {
      setStatus({ type: "error", message: "Vorname ungültig." })
      return
    }

    if (!lockedName && lastName.length < 2) {
      setStatus({ type: "error", message: "Nachname ungültig." })
      return
    }

    if (!isValidEmail(email)) {
      setStatus({ type: "error", message: "E-Mail ungültig." })
      return
    }

    if (password.length < 8) {
      setStatus({ type: "error", message: "Passwort muss mindestens 8 Zeichen haben." })
      return
    }

    if (password !== password2) {
      setStatus({ type: "error", message: "Passwörter stimmen nicht überein." })
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/member-account-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, firstName, lastName, email, password }),
      })

      const data = (await res.json().catch(() => null)) as any

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data?.error || "Senden fehlgeschlagen. Bitte versuche es später erneut.",
        })
        return
      }

      setStatus({
        type: "success",
        message:
          "Fast fertig! Wir haben dir eine Bestätigungs-E-Mail gesendet. Bitte bestätige die E-Mail. Falls du keine Nachricht siehst, prüfe bitte auch deinen Spam-Ordner.",
      })

      setForm({
        code: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        password2: "",
      })
      setLockedName(false)
      setShowPw(false)
    } catch {
      setStatus({
        type: "error",
        message: "Senden fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col text-gray-900">
      <Header />

      <main className="flex-grow px-4 pt-20 pb-28">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-gray-900">Konto anfordern</h1>

            <p className="text-gray-600 mt-2">
              Mitglieder-Code prüfen und danach E-Mail + Passwort festlegen
            </p>
          </div>

          <Card className="rounded-3xl shadow-xl border border-gray-200 bg-white">
            <CardContent className="p-6 space-y-5">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100">
                    <Shield className="h-5 w-5 text-orange-700" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-base font-black text-orange-900">
                      Nur für Vereinsmitglieder
                    </div>

                    <div className="mt-1 text-sm text-orange-800">
                      Bitte nutze deinen Mitglieder-Code. Wenn du keinen Code hast,
                      melde dich beim Vorstand.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 uppercase">
                  Mitglieder-Code
                </label>

                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      value={form.code}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, code: e.target.value }))
                        setLockedName(false)
                      }}
                      placeholder="z.B. QR-T639-P2D"
                      className="w-full pl-12 pr-3 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none bg-white"
                      autoComplete="off"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={lookupByCode}
                    disabled={lookingUp}
                    className="h-12 rounded-xl bg-gray-900 hover:bg-gray-800 px-4"
                  >
                    {lookingUp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Prüfen
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Prüfen
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Du kannst den Code mit oder ohne Bindestriche eingeben.
                </p>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 uppercase">
                  Vorname
                </label>

                <input
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  className={`mt-1 w-full px-4 h-12 rounded-xl border-2 focus:border-orange-500 focus:outline-none ${
                    lockedName ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                  }`}
                  disabled={lockedName}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 uppercase">
                  Nachname
                </label>

                <input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder={lockedName ? "kein Nachname hinterlegt" : ""}
                  className={`mt-1 w-full px-4 h-12 rounded-xl border-2 focus:border-orange-500 focus:outline-none ${
                    lockedName ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                  }`}
                  disabled={lockedName}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 uppercase">
                  E-Mail-Adresse
                </label>

                <div className="relative mt-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="deine.email@example.com"
                    className="w-full pl-12 pr-3 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none bg-white"
                    inputMode="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 uppercase">
                  Passwort
                </label>

                <div className="relative mt-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="mind. 8 Zeichen"
                    className="w-full pl-12 pr-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none bg-white"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    aria-label={showPw ? "Passwort verstecken" : "Passwort anzeigen"}
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <p className={`text-xs mt-2 ${form.password.length >= 8 ? "text-green-700" : "text-gray-500"}`}>
                  Mindestens 8 Zeichen
                </p>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 uppercase">
                  Passwort wiederholen
                </label>

                <input
                  type={showPw ? "text" : "password"}
                  value={form.password2}
                  onChange={(e) => setForm((p) => ({ ...p, password2: e.target.value }))}
                  placeholder="nochmal eingeben"
                  className="mt-1 w-full px-4 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none bg-white"
                  autoComplete="new-password"
                />

                {form.password2 ? (
                  <p className={`text-xs mt-2 ${form.password === form.password2 ? "text-green-700" : "text-red-600"}`}>
                    {form.password === form.password2
                      ? "✓ stimmt überein"
                      : "Passwörter sind nicht gleich"}
                  </p>
                ) : null}
              </div>

              {status.type ? (
                <div
                  className={`rounded-2xl p-4 text-sm border ${
                    status.type === "success"
                      ? "bg-green-50 text-green-800 border-green-200"
                      : status.type === "info"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {status.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5" />
                    ) : (
                      <span className="mt-0.5">⚠️</span>
                    )}
                    <div>{status.message}</div>
                  </div>
                </div>
              ) : null}

              <Button
                onClick={submit}
                disabled={!canSubmit}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Senden...
                  </>
                ) : (
                  "Konto anfordern"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}