"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Mail, Lock, Users, Eye, EyeOff, KeyRound } from "lucide-react"

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

      <main className="flex-grow flex items-center justify-center p-4 pb-24">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </main>

      <MobileBottomNav />
    </div>
  )
}

function MemberLoginClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState("")

  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  const mapAuthError = (error: any) => {
    const msg = error?.message?.toLowerCase() || ""

    if (msg.includes("invalid login credentials")) {
      return "E-Mail oder Passwort ist nicht korrekt."
    }

    if (msg.includes("email not confirmed")) {
      return "Bitte bestätige zuerst deine E-Mail-Adresse."
    }

    if (msg.includes("too many requests")) {
      return "Zu viele Versuche. Bitte warte kurz und versuche es erneut."
    }

    return "Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben."
  }

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) return
    router.replace(`/member-set-password?code=${encodeURIComponent(code)}`)
  }, [searchParams, router])

  useEffect(() => {
    if (authLoading || !session?.user) return

    // Bereits angemeldet: direkt in den Mitgliederbereich.
    // Sperren und Zugriffsrechte prüft zentral der AppRouteGuard.
    router.replace("/member-profile-app")
  }, [session?.user?.id, authLoading, router])

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
        setMessage(mapAuthError(error))
        return
      }

      if (!data.user || !data.session) {
        setMessage("Anmeldung fehlgeschlagen.")
        return
      }

      // signInWithPassword hat bereits eine gültige Session geliefert.
      // Keine zweite Profilprüfung und kein vorschnelles signOut hier:
      // Der zentrale AppRouteGuard prüft Sperre und Berechtigungen.
      router.replace("/member-profile-app")
      router.refresh()
    } catch {
      setMessage("Ein Fehler ist aufgetreten.")
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

      const redirectTo = `${window.location.origin}/member-set-password`

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      })

      if (error) {
        setMessage("Reset fehlgeschlagen.")
        return
      }

      setMessage("Reset-Mail wurde gesendet.")
    } catch {
      setMessage("Reset fehlgeschlagen.")
    } finally {
      setResetLoading(false)
    }
  }

  if (authLoading) return <LoginSkeleton />

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col text-gray-900">
      <Header />

      <main className="flex-grow px-4 pt-20 pb-28">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-gray-900">
              Member-Zugang
            </h1>

            <p className="text-gray-600 mt-2">
              Willkommen bei Emoj!'s Dartverein
            </p>
          </div>

          <Card className="rounded-3xl shadow-xl border border-gray-200 bg-white">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-gray-700 uppercase">
                    E-Mail-Adresse
                  </label>

                  <div className="relative mt-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="deine.email@example.com"
                      className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 uppercase">
                    Passwort
                  </label>

                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Dein Passwort"
                      className="pl-12 pr-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl text-center">
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg"
                >
                  {loading ? "Wird geladen…" : "Anmelden"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={resetLoading}
                  onClick={handlePasswordReset}
                  className="w-full h-12 rounded-xl border-2"
                >
                  <KeyRound className="w-5 h-5 mr-2" />
                  {resetLoading ? "Sende Reset-Mail…" : "Passwort vergessen"}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}