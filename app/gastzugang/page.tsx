"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Mail,
  Lock,
  UserRound,
  Phone,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
} from "lucide-react"

export default function GastzugangPage() {
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
  const [terminalMode, setTerminalMode] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTerminalMode(params.get("terminal") === "1")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setSuccess(false)

    try {
      const res = await fetch("/api/guest-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        setMessage(data?.error || "Antrag konnte nicht gesendet werden.")
        return
      }

      setSuccess(true)
      setMessage(
        terminalMode
          ? "Registrierung gespeichert. Öffne jetzt die Bestätigungs-E-Mail auf deinem eigenen Handy. Danach meldest du dich dort im Gastbereich an und legst deine persönliche 4-stellige Terminal-PIN fest."
          : "Fast geschafft: Wir haben dir eine Bestätigungs-E-Mail gesendet. Bitte bestätige deine E-Mail-Adresse – danach ist dein Gastkonto direkt aktiv.",
      )

      setFirstName("")
      setLastName("")
      setPlayerName("")
      setEmail("")
      setPhone("")
      setPassword("")
    } catch {
      setMessage("Ein Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0 1000px #111418 inset !important;
          box-shadow: 0 0 0 1000px #111418 inset !important;
          transition: background-color 9999s ease-out 0s !important;
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.17),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_52%_84%,rgba(99,102,241,.08),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-6 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:p-8 lg:min-h-[680px] lg:p-9">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(249,115,22,.12),transparent_38%,rgba(14,165,233,.08))]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-500/15">
                  <ShieldCheck className="h-7 w-7 text-orange-100" />
                </div>
                <div className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Gastzugang · EMD</div>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">Dein Zugang zur Turnierwelt.</h1>
                <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-white/50 sm:text-base">
                  Nach der E-Mail-Bestätigung ist dein kostenloses Gastkonto sofort aktiv. Eine Vereinsmitgliedschaft ist davon getrennt und muss weiterhin vom Verein bestätigt werden.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-white/35">1 · Gastkonto erstellen</div>
                  <div className="mt-1 text-sm font-bold text-white/75">Daten ausfüllen und kostenlos registrieren.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-white/35">2 · E-Mail bestätigen</div>
                  <div className="mt-1 text-sm font-bold text-white/75">Bestätigungslink in deiner E-Mail öffnen.</div>
                </div>
                <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-200/70">3 · Loslegen</div>
                  <div className="mt-1 text-sm font-bold text-orange-100">Einloggen und den Gastbereich sofort nutzen.</div>
                </div>
              </div>
            </div>
          </section>

          <Card className="rounded-[30px] border border-white/10 bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl">
            <CardContent className="p-5 sm:p-7 lg:p-8">
              <div className="mb-6">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Gastkonto erstellen</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">Gastkonto erstellen</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">Dein Gastkonto wird nach Bestätigung deiner E-Mail-Adresse automatisch aktiv.</p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Vorname</label>
                  <div className="relative mt-2">
                    <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <Input
                      type="text"
                      name="given-name"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Max"
                      className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 text-white placeholder:text-white/25"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Nachname</label>
                  <div className="relative mt-2">
                    <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <Input
                      type="text"
                      name="family-name"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Mustermann"
                      className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 text-white placeholder:text-white/25"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Spielername / Dartname</label>
                  <div className="relative mt-2">
                    <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <Input type="text" name="nickname" autoComplete="nickname" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Optional" className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 text-white placeholder:text-white/25" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">E-Mail-Adresse</label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <Input type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deine.email@example.com" className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 text-white placeholder:text-white/25" required />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Telefonnummer</label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <Input type="tel" name="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 text-white placeholder:text-white/25" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Passwort</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <Input type={showPassword ? "text" : "password"} name="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mindestens 8 Zeichen" className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 pr-12 text-white placeholder:text-white/25" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/30">Dein Browser kann das neue Passwort sicher im Passwortmanager speichern.</p>
                </div>

                {message ? (
                  <div className={`sm:col-span-2 rounded-xl border p-3 text-center text-sm font-semibold ${success ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-red-400/25 bg-red-400/10 text-red-200"}`}>
                    {message}
                  </div>
                ) : null}

                <div className="sm:col-span-2">
                  <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-orange-500 text-base font-black text-white shadow-[0_0_30px_rgba(249,115,22,.16)] hover:bg-orange-600">
                    <Send className="mr-2 h-5 w-5" />
                    {loading ? "Wird erstellt…" : "Kostenloses Gastkonto erstellen"}
                  </Button>
                </div>
              </form>

              {terminalMode ? (
                <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.06] p-4 text-center text-sm font-semibold leading-6 text-emerald-100/80">
                  Am Vereins-Tablet ist nur die Registrierung vorgesehen. E-Mail bestätigen, Gast-Login und Terminal-PIN richtest du danach auf deinem eigenen Handy ein.
                </div>
              ) : (
                <div className="mt-5 grid gap-2 text-center text-sm text-white/45 sm:grid-cols-2">
                  <div>Schon registriert? <Link href="/guest-login" className="font-black text-orange-300 hover:text-orange-200">Gast-Login</Link></div>
                  <div>Vereinsmitglied? <Link href="/member-login" className="font-black text-white/70 hover:text-white">Member-Login</Link></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
