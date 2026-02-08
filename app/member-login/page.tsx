"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Mail, Lock, ArrowRight, Users, Crown, ShieldCheck, KeyRound } from "lucide-react"

/**
 * Wichtig:
 * - Suspense um useSearchParams ist der stabilste Weg für Builds/Prerender-Kontexte.
 * - dynamic="force-dynamic" verhindert SSG/Prerender bei Auth-Seiten.
 */
export default function MemberLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <MemberLoginClient />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </main>
      <MobileBottomNav />
    </div>
  )
}

function MemberLoginClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState("")

  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  // ✅ Recovery link kommt bei dir als ?code=...
  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) return
    setMessage("Aktiviere Link…")
    router.replace(`/member-set-password?code=${encodeURIComponent(code)}`)
  }, [searchParams, router])

  // ✅ Wenn schon eingeloggt → weiter
  useEffect(() => {
    if (!authLoading && session) router.push("/member-profile-app")
  }, [session, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const cleanEmail = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        setMessage(`Anmeldung fehlgeschlagen: ${error.message}`)
        return
      }

      if (data.user) router.push("/member-profile-app")
      else setMessage("Anmeldung fehlgeschlagen: Kein User zurückgegeben.")
    } catch (err: any) {
      setMessage(`Anmeldung fehlgeschlagen: ${err?.message || "Unbekannter Fehler"}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setResetLoading(true)
    setMessage("")
    try {
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail) {
        setMessage("Bitte zuerst deine E-Mail-Adresse eingeben.")
        return
      }

      // ✅ direkt auf Passwort-Seite
      const redirectTo = `${window.location.origin}/member-set-password`
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })
      if (error) {
        setMessage(`Reset fehlgeschlagen: ${error.message}`)
        return
      }

      setMessage("Reset-Mail wurde gesendet. Bitte Link in der Mail klicken.")
    } catch (e: any) {
      setMessage(`Reset fehlgeschlagen: ${e?.message || "Unbekannter Fehler"}`)
    } finally {
      setResetLoading(false)
    }
  }

  if (authLoading) return <LoginSkeleton />

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center p-4 pb-24 md:pb-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Member-Zugang</h1>
            <p className="text-gray-600 text-lg">Willkommen bei Emoj!&apos;s Dartverein</p>
          </div>

          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-6 text-center">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Kapitäne</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Co-Kapitäne</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Spieler</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="deine.email@example.com"
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-orange-500 rounded-xl"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Dein Passwort"
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-orange-500 rounded-xl"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {message ? (
                  <div
                    className={`text-center p-4 rounded-xl text-sm font-medium ${
                      message.includes("gesendet") || message.includes("Aktiviere")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {message}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg"
                >
                  {loading ? (
                    "Wird geladen…"
                  ) : (
                    <div className="flex items-center gap-2">
                      Anmelden
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={resetLoading || loading}
                  onClick={handlePasswordReset}
                  className="w-full h-12 rounded-xl border-2"
                >
                  {resetLoading ? (
                    "Sende Reset-Mail…"
                  ) : (
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      Passwort vergessen
                    </div>
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  Noch keinen Zugang?{" "}
                  <Link href="/member-register" className="font-semibold text-orange-600 hover:text-orange-700">
                    Mit Code registrieren
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
