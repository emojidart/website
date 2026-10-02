"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react"

export default function TerminalGastRegistrierungPage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setSuccess(false)

    try {
      const res = await fetch("/api/guest-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          playerName,
          email,
          phone,
          password,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMessage(data?.error || "Registrierung konnte nicht abgeschlossen werden.")
        return
      }

      setSuccess(true)
      setMessage(
        "Die Registrierung wurde erfolgreich übermittelt. Eine Bestätigungs-E-Mail wurde versendet. Bitte öffnen Sie diese auf Ihrem persönlichen Gerät und bestätigen Sie dort Ihre E-Mail-Adresse.",
      )
      setFirstName("")
      setLastName("")
      setPlayerName("")
      setEmail("")
      setPhone("")
      setPassword("")
    } catch {
      setMessage("Die Registrierung konnte aufgrund eines technischen Fehlers nicht abgeschlossen werden.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0 1000px #10151c inset !important;
          box-shadow: 0 0 0 1000px #10151c inset !important;
          transition: background-color 9999s ease-out 0s !important;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.78),rgba(3,5,9,.94)_48%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.17),transparent_28%),radial-gradient(circle_at_88%_28%,rgba(14,165,233,.13),transparent_30%)]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push("/terminal/turnieranmeldung")}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-black text-white/70 backdrop-blur-xl transition hover:bg-white/[0.06] hover:text-white active:scale-[.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Turnieranmeldung
          </button>

          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300/60">EMD Club Terminal</div>
            <div className="mt-1 text-sm font-black text-white/65">Gastregistrierung</div>
          </div>
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[.78fr_1.22fr] lg:items-stretch">
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-black/38 p-6 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:p-8 lg:p-9">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(249,115,22,.13),transparent_42%,rgba(14,165,233,.07))]" />
            <div className="relative flex h-full flex-col">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-500/15">
                <ShieldCheck className="h-7 w-7 text-orange-100" />
              </div>

              <div className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Gastregistrierung</div>
              <h1 className="mt-2 max-w-xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Gastkonto am Club-Terminal erstellen
              </h1>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-white/48 sm:text-base">
                Hier wird ausschließlich das Gastkonto angelegt. Die Bestätigung der E-Mail-Adresse und die Einrichtung der persönlichen Terminal-Anmeldung erfolgen anschließend auf dem eigenen Gerät.
              </p>

              <div className="mt-auto space-y-3 pt-10">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/32">Schritt 1</div>
                  <div className="mt-1 text-sm font-black text-white/78">Gastkonto hier registrieren</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/32">Schritt 2</div>
                  <div className="mt-1 text-sm font-black text-white/78">Bestätigungs-E-Mail auf dem eigenen Gerät öffnen</div>
                </div>
                <div className="rounded-2xl border border-orange-300/20 bg-orange-500/[0.08] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-200/65">Schritt 3</div>
                  <div className="mt-1 text-sm font-black text-orange-100">Persönliche PIN oder Entsperrmuster im Gastprofil festlegen</div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-black/38 p-5 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:p-7 lg:p-9">
            {success ? (
              <div className="flex h-full min-h-[610px] flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-emerald-300/20 bg-emerald-500/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-200" />
                </div>
                <div className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/55">Registrierung abgeschlossen</div>
                <h2 className="mt-2 max-w-xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  Bestätigungs-E-Mail wurde versendet
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/48 sm:text-base">
                  {message}
                </p>
                <div className="mt-4 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-sm font-semibold leading-6 text-white/55">
                  Nach der Bestätigung kann die persönliche Terminal-Anmeldung im Gastprofil eingerichtet werden. Danach ist die Anmeldung zu Turnieren am Club-Terminal mit PIN oder Muster möglich.
                </div>
                <Button
                  type="button"
                  onClick={() => router.push("/terminal/turnieranmeldung")}
                  className="mt-7 h-12 rounded-2xl bg-orange-500 px-7 font-black text-white hover:bg-orange-600"
                >
                  Zurück zur Turnieranmeldung
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Neues Gastkonto</div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">Persönliche Daten</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/42">
                    Bitte die Angaben vollständig ausfüllen. Die E-Mail-Adresse wird für die Kontobestätigung benötigt.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vorname">
                    <UserRound className="field-icon" />
                    <Input
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Vorname"
                      className="terminal-input pl-12"
                      required
                    />
                  </Field>

                  <Field label="Nachname">
                    <UserRound className="field-icon" />
                    <Input
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Nachname"
                      className="terminal-input pl-12"
                      required
                    />
                  </Field>

                  <Field label="Spielername / Dartname" optional>
                    <UserRound className="field-icon" />
                    <Input
                      type="text"
                      autoComplete="nickname"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Optional"
                      className="terminal-input pl-12"
                    />
                  </Field>

                  <Field label="E-Mail-Adresse">
                    <Mail className="field-icon" />
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="terminal-input pl-12"
                      required
                    />
                  </Field>

                  <Field label="Telefonnummer" optional>
                    <Phone className="field-icon" />
                    <Input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Optional"
                      className="terminal-input pl-12"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Passwort</label>
                      <span className="text-[10px] font-bold text-white/25">mindestens 8 Zeichen</span>
                    </div>
                    <div className="relative">
                      <Lock className="field-icon" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Passwort festlegen"
                        className="terminal-input pl-12 pr-12"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white"
                        aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {message ? (
                    <div className="sm:col-span-2 rounded-2xl border border-rose-300/20 bg-rose-500/[0.08] p-4 text-center text-sm font-semibold text-rose-100">
                      {message}
                    </div>
                  ) : null}

                  <div className="sm:col-span-2 pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-14 w-full rounded-2xl bg-orange-500 text-base font-black text-white shadow-[0_0_35px_rgba(249,115,22,.16)] hover:bg-orange-600 disabled:opacity-55"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      {loading ? "Registrierung wird verarbeitet…" : "Gastkonto registrieren"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </main>

      <style jsx global>{`
        .terminal-input {
          height: 3.25rem !important;
          border-radius: 1rem !important;
          border-color: rgba(255,255,255,.10) !important;
          background: rgba(8,12,18,.72) !important;
          color: white !important;
        }
        .terminal-input::placeholder { color: rgba(255,255,255,.25) !important; }
        .field-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          height: 1.25rem;
          width: 1.25rem;
          transform: translateY(-50%);
          color: rgba(255,255,255,.28);
          z-index: 10;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  optional = false,
  children,
}: {
  label: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">{label}</label>
        {optional ? <span className="text-[10px] font-bold text-white/25">optional</span> : null}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
