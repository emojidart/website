"use client"

import { useMemo, useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Shield, UserPlus, KeyRound, Search, Lock, Eye, EyeOff } from "lucide-react"

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

/**
 * Accepts:
 *  - QR-T639-P2D
 *  - QRT639P2D
 *  - qr t639 p2d
 * Returns canonical: QR-T639-P2D
 */
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

  const [status, setStatus] = useState<{ type: "success" | "error" | "info" | null; message: string }>({
    type: null,
    message: "",
  })

  const canSubmit = useMemo(() => {
    const codeOk = normalizeCode(form.code).length >= 8
    const firstOk = form.firstName.trim().length >= 2
    const emailOk = isValidEmail(form.email)
    const lastOk = lockedName ? form.lastName.trim().length === 0 || form.lastName.trim().length >= 2 : form.lastName.trim().length >= 2
    const pwOk = form.password.length >= 8
    const pwMatch = form.password === form.password2
    return codeOk && firstOk && lastOk && emailOk && pwOk && pwMatch && !submitting
  }, [form, lockedName, submitting])

  const lookupByCode = async () => {
    setStatus({ type: null, message: "" })

    const code = normalizeCode(form.code)
    if (code.length < 8) {
      setLockedName(false)
      setStatus({ type: "error", message: "Bitte gib deinen Mitglieder-Code ein (z.B. QR-T639-P2D)." })
      return
    }

    setLookingUp(true)
    try {
      const res = await fetch(`/api/member-account-request?code=${encodeURIComponent(code)}`, { method: "GET" })
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

      setForm((p) => ({ ...p, code, firstName: first, lastName: last }))
      setLockedName(true)
      setStatus({ type: "info", message: `Code gefunden: ${fullName}. Bitte E-Mail & Passwort eintragen.` })
    } catch (e: any) {
      setLockedName(false)
      setStatus({ type: "error", message: `Code ungültig: ${e?.message || "Unbekannter Fehler"}` })
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

    if (code.length < 8) return setStatus({ type: "error", message: "Bitte gib deinen Mitglieder-Code korrekt an." })
    if (firstName.length < 2) return setStatus({ type: "error", message: "Vorname ungültig." })
    if (!lockedName && lastName.length < 2) return setStatus({ type: "error", message: "Nachname ungültig." })
    if (!isValidEmail(email)) return setStatus({ type: "error", message: "E-Mail ungültig." })
    if (password.length < 8) return setStatus({ type: "error", message: "Passwort muss mindestens 8 Zeichen haben." })
    if (password !== password2) return setStatus({ type: "error", message: "Passwörter stimmen nicht überein." })

    setSubmitting(true)
    try {
      const res = await fetch("/api/member-account-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, firstName, lastName, email, password }),
      })

      const data = (await res.json().catch(() => null)) as any

      if (!res.ok) {
        // ✅ nur die saubere DE-Message vom Backend anzeigen
        setStatus({
          type: "error",
          message: data?.error || "Senden fehlgeschlagen. Bitte versuche es später erneut.",
        })
        return
      }

      setStatus({
        type: "success",
        message:
          "Fast fertig! Wir haben dir eine Bestätigungs-E-Mail gesendet. Bitte bestätige die E-Mail – danach kannst du dich mit deinem Passwort einloggen. Falls du keine Nachricht siehst, überprüfe bitte auch deinen Spam- oder Junk-Ordner.",
      })

      setForm({ code: "", firstName: "", lastName: "", email: "", password: "", password2: "" })
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <section className="container mx-auto px-4 pt-6 pb-8">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/15 p-2">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black leading-tight">Mitglieder-Konto anfordern</h1>
                <p className="text-sm text-white/90 mt-1">
                  Code prüfen, dann E-Mail + Passwort festlegen. Du bekommst eine Bestätigungs-E-Mail.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex gap-3">
                <div className="mt-0.5">
                  <Shield className="w-4 h-4 text-orange-700" />
                </div>
                <div className="text-sm">
                  <div className="font-bold text-orange-900">Nur für Vereinsmitglieder</div>
                  <div className="text-orange-800 mt-0.5">Bitte nutze deinen Mitglieder-Code. Wenn du keinen Code hast, melde dich beim Vorstand.</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Mitglieder-Code</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      value={form.code}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, code: e.target.value }))
                        setLockedName(false)
                      }}
                      placeholder="z.B. QR-T639-P2D"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                      autoComplete="off"
                    />
                  </div>
                  <Button type="button" onClick={lookupByCode} disabled={lookingUp} className="rounded-xl bg-gray-900 hover:bg-gray-800 font-extrabold h-11 px-4">
                    {lookingUp ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Prüfen
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Prüfen
                      </span>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Tipp: Du kannst den Code mit oder ohne Bindestriche eingeben – wir erkennen beides.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Vorname</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm ${
                      lockedName ? "border-green-200 bg-green-50" : "border-gray-200"
                    }`}
                    disabled={lockedName}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Nachname</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder={lockedName ? "kein Nachname hinterlegt" : ""}
                    className={`w-full px-3 py-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm ${
                      lockedName ? "border-green-200 bg-green-50" : "border-gray-200"
                    }`}
                    disabled={lockedName}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">E-Mail</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                    inputMode="email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Passwort</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                      placeholder="mind. 8 Zeichen"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      aria-label={showPw ? "Passwort verstecken" : "Passwort anzeigen"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className={`text-xs ${form.password.length >= 8 ? "text-green-700" : "text-gray-500"}`}>Mindestens 8 Zeichen</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Passwort wiederholen</label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password2}
                    onChange={(e) => setForm((p) => ({ ...p, password2: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                    placeholder="nochmal eingeben"
                    autoComplete="new-password"
                  />
                  {form.password2 ? (
                    <p className={`text-xs ${form.password === form.password2 ? "text-green-700" : "text-red-600"}`}>
                      {form.password === form.password2 ? "✓ stimmt überein" : "Passwörter sind nicht gleich"}
                    </p>
                  ) : null}
                </div>
              </div>

              {status.type ? (
                <div
                  className={`rounded-xl p-4 text-sm ${
                    status.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : status.type === "info"
                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {status.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <span className="w-4 h-4 mt-0.5">⚠️</span>}
                    <div>{status.message}</div>
                  </div>
                </div>
              ) : null}

              <Button onClick={submit} disabled={!canSubmit} className="w-full bg-orange-600 hover:bg-orange-700 font-extrabold rounded-xl h-11 shadow-lg shadow-orange-600/20">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Senden...
                  </span>
                ) : (
                  "Konto anfordern"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <MobileBottomNav />
    </div>
  )
}